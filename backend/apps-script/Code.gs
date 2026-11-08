const FORM_SHEET = 'Form responses 1';
const ATTENDEES_SHEET = 'Attendees';

function getSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Spreadsheet not connected. Open Apps Script from your Google Sheet using Extensions.');
  }
  return spreadsheet;
}

function getSheet(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  return sheet;
}

function getAttendees() {
  const values = getSheet(FORM_SHEET).getDataRange().getDisplayValues();
  return values.slice(1).map(function (row, index) {
    return {
      sourceRow: index + 2,
      timestamp: row[0] || '',
      name: row[1] || '',
      phoneNumber: row[2] || '',
      location: row[3] || ''
    };
  }).filter(function (attendee) {
    return attendee.name || attendee.phoneNumber;
  });
}

function getCheckIns() {
  const values = getSheet(ATTENDEES_SHEET).getDataRange().getDisplayValues();
  const data = values.slice(1).filter(function (row) {
    return row[0] || row[1];
  }).map(function (row) {
    return {
      name: row[0] || '',
      phoneNumber: row[1] || '',
      location: row[2] || '',
      registrationType: row[3] || '',
      checkInTime: row[4] || ''
    };
  });
  return { success: true, count: data.length, data: data };
}

function checkIn(sourceRow) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const formSheet = getSheet(FORM_SHEET);
    const attendeesSheet = getSheet(ATTENDEES_SHEET);
    sourceRow = Number(sourceRow);
    if (!Number.isInteger(sourceRow) || sourceRow < 2 || sourceRow > formSheet.getLastRow()) {
      throw new Error('Invalid attendee row.');
    }

    const row = formSheet.getRange(sourceRow, 1, 1, 4).getDisplayValues()[0];
    const name = String(row[1] || '').trim();
    const phone = normalizePhone(row[2]);
    if (!name || !phone) throw new Error('Attendee name or phone number is missing.');
    if (hasCheckedInPhone(attendeesSheet, phone)) {
      return { success: false, message: 'This attendee is already checked in.' };
    }

    const checkInTime = new Date();
    attendeesSheet.appendRow([name, row[2], row[3], 'REGISTRATION', checkInTime]);
    return {
      success: true,
      message: 'Check-in successful.',
      attendee: {
        name: name,
        phoneNumber: row[2],
        location: row[3],
        registrationType: 'REGISTRATION',
        checkInTime: checkInTime.toISOString()
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function walkIn(attendee) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet(ATTENDEES_SHEET);
    if (!attendee || !attendee.name || !attendee.phoneNumber) {
      throw new Error('Name and phone number are required.');
    }

    const name = String(attendee.name).trim();
    const phone = String(attendee.phoneNumber).trim();
    const normalizedPhone = normalizePhone(phone);
    const location = String(attendee.location || '').trim();
    if (!name || !normalizedPhone) throw new Error('Valid name and phone number are required.');
    if (hasCheckedInPhone(sheet, normalizedPhone)) {
      return { success: false, message: 'This phone number is already checked in.' };
    }

    const checkInTime = new Date();
    sheet.appendRow([name, phone, location, 'WALK_IN', checkInTime]);
    return {
      success: true,
      message: 'Walk-in registered successfully.',
      attendee: {
        name: name,
        phoneNumber: phone,
        location: location,
        registrationType: 'WALK_IN',
        checkInTime: checkInTime.toISOString()
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function hasCheckedInPhone(sheet, phone) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const existingPhones = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
  return existingPhones.some(function (row) {
    return normalizePhone(row[0]) === phone;
  });
}

function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
  return digits;
}

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';
    let result;
    if (action === 'getAll') {
      const attendees = getAttendees();
      result = { success: true, count: attendees.length, data: attendees };
    } else if (action === 'checkIns') {
      result = getCheckIns();
    } else {
      throw new Error('Invalid GET action: ' + action);
    }
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || String(error) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Request body is missing.');
    const request = JSON.parse(e.postData.contents);
    let result;
    if (request.action === 'checkIn') {
      result = checkIn(request.sourceRow);
    } else if (request.action === 'walkIn') {
      result = walkIn(request.attendee);
    } else {
      throw new Error('Invalid POST action.');
    }
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || String(error) });
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
