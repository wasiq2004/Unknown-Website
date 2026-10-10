# Connect the website forms to Google Sheets

Every time someone submits a form on the website, a new row is added to a Google Sheet:

| Form on the website | Tab in the sheet |
|---|---|
| Book a Counseling Session (Home and Contact pages) | **Counseling Requests** |
| Partnership Enquiry (Partnerships page) | **Partnership Enquiries** |

The tabs and their header rows are created automatically with the first submission. Setup takes about 5 minutes and needs a Google account. Use the account that should own the data (for example, the AIMS admissions account).

## 1. Create the sheet and add the script

1. Go to [sheets.new](https://sheets.new) to create a new Google Sheet. Name it, for example, **AIMS Website Enquiries**.
2. In the sheet's menu, open **Extensions → Apps Script**.
3. Delete everything in the `Code.gs` editor, then paste in the full contents of [`Code.gs`](Code.gs) from this folder.
4. *Optional:* to get an email for every new submission, put an address in line 14:
   `const NOTIFY_EMAIL = "admissions@your-domain.com";`
5. Click **Save** (the disk icon).

## 2. Deploy it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** AIMS website forms
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**. This is required so website visitors can submit. They can only add rows through the form; they cannot see or open the sheet.
4. Click **Deploy**, then **Authorize access**. Choose your Google account. If you see "Google hasn't verified this app", click **Advanced → Go to (project name)**, then **Allow**. This is normal for your own scripts.
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.

To check it works, open that URL in your browser. You should see `{"result":"ok","message":"AIMS form handler is running."}`.

## 3. Add the URL to the website

Open [`assets/js/main.js`](../assets/js/main.js) and paste the URL into `sheetsUrl` near the top:

```js
sheetsUrl: "https://script.google.com/macros/s/AKfy.../exec",
```

Save the file and upload the website again. Submit a test enquiry and it appears in the sheet within a few seconds.

## Good to know

- **Before the URL is added**, the forms still work. They open the visitor's email app with the details filled in, as before.
- **If a submission fails** (for example, the visitor's internet drops), the visitor sees a message asking them to try again, with the AIMS email address as an alternative. Their typed details are kept.
- **Spam protection:** the forms include a hidden field that people never see but spam bots fill in. Those submissions are silently discarded.
- **Safe cell values:** entries that start with `=`, `+`, `-` or `@` (such as phone numbers like `+63 917…`) are stored as plain text, so nothing a visitor types can run as a spreadsheet formula.
- **Changing the script later:** after editing `Code.gs`, go to **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same, so the website does not need updating.
- **Do not rename the tabs** "Counseling Requests" and "Partnership Enquiries". If you do, a new tab with the original name is created on the next submission. You can add your own columns to the right (for example "Status" or "Assigned to"); the script only fills the first eight.
