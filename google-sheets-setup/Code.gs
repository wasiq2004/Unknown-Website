/**
 * Antony International Medical Studies (AIMS): website form handler.
 *
 * Receives submissions from the website's two forms and appends them to this spreadsheet:
 *   - "Counseling Requests"    (Book a Counseling Session form)
 *   - "Partnership Enquiries"  (Partnership Enquiry form)
 * The tabs and their header rows are created automatically on the first submission.
 *
 * Setup: see SETUP.md in the same folder.
 */

// Optional: email address that receives a short notification for every new submission.
// Leave empty ("") to turn notifications off.
const NOTIFY_EMAIL = "";

const FORMS = {
  counseling: {
    sheet: "Counseling Requests",
    columns: [
      ["name", "Full Name", true],
      ["country", "Country of Residence", true],
      ["contact", "Email / WhatsApp", true],
      ["program", "Program of Interest", true],
      ["enquiringAs", "Enquiring As", true],
      ["message", "Message", false],
    ],
  },
  partner: {
    sheet: "Partnership Enquiries",
    columns: [
      ["org", "Institution / Organization", true],
      ["type", "Type of Organization", true],
      ["name", "Contact Person", true],
      ["country", "Country", true],
      ["email", "Work Email", true],
      ["message", "Message", false],
    ],
  },
};

const MAX_LENGTH = { message: 3000, default: 300 };

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const p = (e && e.parameter) || {};
    const form = FORMS[p.formType];
    if (!form) return respond_({ result: "error", error: "Unknown form." });

    // Spam trap: real visitors never see or fill the "website" field.
    if (p.website) return respond_({ result: "success" });

    const values = [];
    for (const [key, label, required] of form.columns) {
      const raw = String(p[key] || "").trim();
      if (required && !raw) return respond_({ result: "error", error: `Missing field: ${label}.` });
      const max = MAX_LENGTH[key] || MAX_LENGTH.default;
      if (raw.length > max) return respond_({ result: "error", error: `${label} is too long.` });
      values.push(safeCell_(raw));
    }

    lock.waitLock(20000);
    const sheet = getSheet_(form);
    sheet.appendRow([new Date(), ...values, safeCell_(String(p.page || "").slice(0, 100))]);
    lock.releaseLock();

    notify_(form, values);
    return respond_({ result: "success" });
  } catch (err) {
    return respond_({ result: "error", error: "The submission could not be saved. Please try again." });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

// Visiting the web app URL in a browser shows this, which confirms the deployment works.
function doGet() {
  return respond_({ result: "ok", message: "AIMS form handler is running." });
}

function getSheet_(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(form.sheet);
  if (!sheet) {
    sheet = ss.insertSheet(form.sheet);
    const headers = ["Submitted At", ...form.columns.map((c) => c[1]), "Page"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm");
  }
  return sheet;
}

// Stops values such as "=HYPERLINK(...)" or "+63 917..." from being treated as formulas.
function safeCell_(value) {
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function notify_(form, values) {
  if (!NOTIFY_EMAIL) return;
  try {
    const lines = form.columns.map((c, i) => `${c[1]}: ${String(values[i]).replace(/^'/, "")}`);
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: `New website submission: ${form.sheet}`,
      body: lines.join("\n") + "\n\nOpen the spreadsheet: " + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    });
  } catch (ignored) {
    // The row is already saved; a failed notification should not fail the submission.
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
