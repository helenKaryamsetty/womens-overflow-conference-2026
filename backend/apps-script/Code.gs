/**
 * Women’s Overflow Apps Script backend skeleton.
 * Replace the config values and spreadsheet mappings after the live sheet structure is provided.
 */

const CONFIG = {
  spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
  registrationSheet: 'Registrations',
  historySheet: 'CheckIns',
  nameColumn: 'A',
  phoneColumn: 'B',
  emailColumn: 'C',
  registrationIdColumn: 'D',
  statusColumn: 'E',
  checkedInAtColumn: 'F',
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'healthCheck';

  switch (action) {
    case 'healthCheck':
      return jsonResponse({ success: true, data: { status: 'ready' } });
    case 'searchAttendees':
      return jsonResponse(searchAttendees(e && e.parameter ? e.parameter.q : ''));
    case 'getAttendanceStats':
      return jsonResponse(getAttendanceStats());
    case 'checkInAttendee':
      return jsonResponse(checkInAttendee(e && e.parameter ? e.parameter.attendeeId : ''));
    case 'registerWalkIn':
      return jsonResponse(registerWalkIn(e && e.parameter ? e.parameter : {}));
    case 'getRecentCheckIns':
      return jsonResponse(getRecentCheckIns());
    default:
      return jsonResponse({ success: false, error: { code: 'UNKNOWN_ACTION', message: 'Unsupported backend action.' } });
  }
}

function healthCheck() {
  return { success: true, data: { status: 'ready' } };
}

function searchAttendees(query) {
  return {
    success: true,
    data: [],
    message: 'Insert sheet-based attendee search here.',
  };
}

function getAttendanceStats() {
  return {
    success: true,
    data: { totalRegistered: 0, checkedIn: 0, yetToArrive: 0 },
    message: 'Insert attendance summary logic here.',
  };
}

function checkInAttendee(attendeeId) {
  if (!attendeeId) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'An attendee id is required.' },
    };
  }

  return {
    success: true,
    data: { id: attendeeId, status: 'checked-in' },
    message: 'Implement Sheets locking and idempotent check-in logic here.',
  };
}

function registerWalkIn(payload) {
  if (!payload || !payload.name || !payload.mobile) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Name and mobile number are required.' },
    };
  }

  return {
    success: true,
    data: { id: 'WALKIN_TEMP', name: payload.name, status: 'checked-in' },
    message: 'Implement duplicate-safe walk-in registration here.',
  };
}

function getRecentCheckIns() {
  return {
    success: true,
    data: [],
    message: 'Return the latest successful check-ins from the history sheet.',
  };
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
