/* Antony International Medical Studies: site behaviour (shared by every page) */

const CONFIG = {
  // Google Sheets: paste the Web app URL from Apps Script here (see google-sheets-setup/SETUP.md).
  // It looks like "https://script.google.com/macros/s/XXXXXXXX/exec".
  // While this is empty, the forms fall back to opening the visitor's email app.
  sheetsUrl: "",

  // Contact details shown in the footer and on the contact page.
  // Replace these with the real AIMS contact details before the site goes live.
  // Leave phone or whatsapp empty ("") to hide them. WhatsApp: digits only, with country code, e.g. "639171234567".
  email: "admissions@example.com",
  phone: "",
  whatsapp: "",
};

/* ---------- Header: shadow on scroll + mobile menu ---------- */

const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLabel = document.querySelector("[data-nav-label]");
const desktopNav = window.matchMedia("(min-width: 1141px)");

const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 4);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

function setNav(open) {
  nav.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navLabel.textContent = open ? "Close menu" : "Open menu";
}

navToggle.addEventListener("click", () => setNav(navToggle.getAttribute("aria-expanded") !== "true"));
nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); navToggle.focus(); }
});
document.addEventListener("click", (e) => {
  if (nav.classList.contains("is-open") && !header.contains(e.target)) setNav(false);
});
desktopNav.addEventListener("change", (e) => { if (e.matches) setNav(false); });

/* ---------- Forms (counseling + partnership) ---------- */

const required = (msg) => (v) => (v.trim().length >= 2 ? "" : msg);
const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const FORMS = {
  counseling: {
    rules: {
      name: required("Please enter your full name."),
      country: required("Please enter your country of residence."),
      contact: (v) => {
        const s = v.trim();
        if (!s) return "Please enter an email address or WhatsApp number so we can reply.";
        if (s.includes("@")) return emailOk(s) ? "" : "Please check the email address, for example name@example.com.";
        return s.replace(/\D/g, "").length >= 7 ? "" : "Please enter the full number including the country code, for example +63 917 123 4567.";
      },
      program: (v) => (v ? "" : "Please select a program, or choose “I'm not sure yet”."),
    },
    // Field names match the columns in google-sheets-setup/Code.gs
    data: (f) => ({
      name: f.name.value.trim(),
      country: f.country.value.trim(),
      contact: f.contact.value.trim(),
      program: f.program.value,
      enquiringAs: f.parent.checked ? "Parent or guardian" : "Student",
      message: f.message.value.trim(),
    }),
    sent: {
      title: "Thank you, your request has been received",
      text: "An AIMS counselor will contact you soon using the details you provided.",
      again: "Send another request",
    },
    mail: (d) => ({
      subject: `Counseling request: ${d.name}`,
      body: [
        `Name: ${d.name}`,
        `Country of residence: ${d.country}`,
        `Email / WhatsApp: ${d.contact}`,
        `Program of interest: ${d.program}`,
        `Enquiring as: ${d.enquiringAs}`,
        "",
        d.message || "Please contact me to arrange a counseling session.",
      ].join("\n"),
      title: "Your request is ready to send",
      text: "We have opened your email app with your details filled in. Press send and an AIMS counselor will reply.",
    }),
  },
  partner: {
    rules: {
      org: required("Please enter the name of your institution or organization."),
      type: (v) => (v ? "" : "Please select the type of organization."),
      name: required("Please enter the name of the contact person."),
      country: required("Please enter your country."),
      email: (v) => (emailOk(v.trim()) ? "" : "Please enter a valid work email, for example name@university.edu."),
    },
    data: (f) => ({
      org: f.org.value.trim(),
      type: f.type.value,
      name: f.name.value.trim(),
      country: f.country.value.trim(),
      email: f.email.value.trim(),
      message: f.message.value.trim(),
    }),
    sent: {
      title: "Thank you, your enquiry has been received",
      text: "The AIMS team will reply to discuss next steps.",
      again: "Send another enquiry",
    },
    mail: (d) => ({
      subject: `Partnership enquiry: ${d.org}`,
      body: [
        `Organization: ${d.org}`,
        `Type: ${d.type}`,
        `Contact person: ${d.name}`,
        `Country: ${d.country}`,
        `Email: ${d.email}`,
        "",
        d.message || "We would like to discuss a partnership with AIMS.",
      ].join("\n"),
      title: "Your enquiry is ready to send",
      text: "We have opened your email app with your details filled in. Press send and the AIMS team will reply.",
    }),
  },
};

function setError(field, msg) {
  const err = document.getElementById(`${field.id}-err`);
  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", err.id);
  err.textContent = msg;
  err.hidden = false;
}

function clearError(field) {
  const err = document.getElementById(`${field.id}-err`);
  field.removeAttribute("aria-invalid");
  field.removeAttribute("aria-describedby");
  err.hidden = true;
}

const mailto = (subject, body) =>
  `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

function emailLink(subject, body) {
  const a = document.createElement("a");
  a.href = mailto(subject, body);
  a.textContent = CONFIG.email;
  return a;
}

// Sends one submission to the Google Apps Script web app. Resolves on success, throws otherwise.
async function sendToSheet(formType, data, honeypot) {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const body = new URLSearchParams({ formType, ...data, website: honeypot, page });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(CONFIG.sheetsUrl, { method: "POST", body, signal: controller.signal });
    const json = await res.json();
    if (json.result !== "success") throw new Error(json.error || "Submission was not saved.");
  } finally {
    clearTimeout(timer);
  }
}

document.querySelectorAll("[data-form]").forEach((form) => {
  const type = form.dataset.form;
  const spec = FORMS[type];
  const card = form.closest("[data-form-card]");
  const formView = card.querySelector("[data-form-view]");
  const doneView = card.querySelector("[data-form-done]");
  const status = form.querySelector("[data-form-status]");
  const submitBtn = form.querySelector('[type="submit"]');
  const submitLabel = submitBtn.innerHTML;
  const editBtn = doneView.querySelector("[data-form-edit]");
  const f = form.elements;
  let sending = false;

  Object.entries(spec.rules).forEach(([name, rule]) => {
    const field = f[name];
    const validate = () => { const m = rule(field.value); m ? setError(field, m) : clearError(field); };
    if (field.tagName === "SELECT") {
      field.addEventListener("change", () => { field.classList.remove("just-set"); validate(); });
    } else {
      field.addEventListener("blur", () => { if (field.getAttribute("aria-invalid") === "true") validate(); });
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true" && !rule(field.value)) clearError(field);
      });
    }
  });

  function showDone(title, text, buttonLabel, alt) {
    doneView.querySelector("[data-done-title]").textContent = title;
    doneView.querySelector("[data-done-text]").textContent = text;
    const altEl = doneView.querySelector("[data-done-alt]");
    altEl.replaceChildren(...(alt || []));
    altEl.hidden = !alt;
    editBtn.textContent = buttonLabel;
    formView.hidden = true;
    doneView.hidden = false;
    doneView.focus();
  }

  function setSending(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.setAttribute("aria-busy", String(on));
    submitBtn.innerHTML = on ? "Sending…" : submitLabel;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    status.hidden = true;

    let firstInvalid = null;
    Object.entries(spec.rules).forEach(([name, rule]) => {
      const m = rule(f[name].value);
      if (m) { setError(f[name], m); firstInvalid ||= f[name]; } else clearError(f[name]);
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    const data = spec.data(f);
    const mail = spec.mail(data);

    // Not connected to Google Sheets yet: hand the message to the visitor's email app.
    if (!CONFIG.sheetsUrl) {
      window.location.href = mailto(mail.subject, mail.body);
      const alt = [document.createTextNode("If your email app did not open, write to us at "), emailLink(mail.subject, mail.body)];
      if (CONFIG.whatsapp && type === "counseling") {
        const wa = document.createElement("a");
        wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mail.body)}`;
        wa.target = "_blank";
        wa.rel = "noopener";
        wa.textContent = "send it on WhatsApp";
        alt.push(document.createTextNode(", or "), wa);
      }
      alt.push(document.createTextNode("."));
      showDone(mail.title, mail.text, "Edit my details", alt);
      return;
    }

    setSending(true);
    try {
      await sendToSheet(type, data, f.website ? f.website.value : "");
      form.reset();
      f.program && f.program.classList.remove("just-set");
      showDone(spec.sent.title, spec.sent.text, spec.sent.again, null);
    } catch (err) {
      status.replaceChildren(
        document.createTextNode("We couldn't send your details. Please check your internet connection and try again, or email us at "),
        emailLink(mail.subject, mail.body),
        document.createTextNode("."),
      );
      status.hidden = false;
      status.focus();
    } finally {
      setSending(false);
    }
  });

  editBtn.addEventListener("click", () => {
    doneView.hidden = true;
    formView.hidden = false;
    form.querySelector("input, select").focus();
  });
});

// A program link (contact.html?program=Nursing) pre-selects that program.
const programSelect = document.getElementById("f-program");
const wanted = new URLSearchParams(window.location.search).get("program");
if (programSelect && wanted && [...programSelect.options].some((o) => o.value === wanted)) {
  programSelect.value = wanted;
  programSelect.classList.add("just-set");
}

/* ---------- Contact details + year ---------- */

const contactItems = [
  CONFIG.email && { href: `mailto:${CONFIG.email}`, label: "Email", text: CONFIG.email },
  CONFIG.phone && { href: `tel:${CONFIG.phone.replace(/[^\d+]/g, "")}`, label: "Phone", text: CONFIG.phone },
  CONFIG.whatsapp && { href: `https://wa.me/${CONFIG.whatsapp}`, label: "WhatsApp", text: `+${CONFIG.whatsapp}` },
].filter(Boolean);

document.querySelectorAll("[data-contact-list]").forEach((list) => {
  contactItems.forEach(({ href, label, text }) => {
    const li = document.createElement("li");
    const l = document.createElement("span");
    l.className = "contact-label";
    l.textContent = label;
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    if (href.startsWith("https://")) { a.target = "_blank"; a.rel = "noopener"; }
    li.append(l, a);
    list.appendChild(li);
  });
});

document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- Motion: reveals, word headlines, parallax, hero tilt, progress bar ---------- */

const motion = document.documentElement.classList.contains("js-motion");
window.AIMS_MOTION_READY = true;

// Reading progress bar under the header (also shown when motion is reduced: it only follows the scroll).
const progress = document.createElement("div");
progress.className = "scroll-progress";
progress.setAttribute("aria-hidden", "true");
progress.appendChild(document.createElement("span"));
header.appendChild(progress);
const progressFill = progress.firstChild;

const parallaxImages = motion ? [...document.querySelectorAll(".page-banner-img, .statement-img")] : [];

function onFrame() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressFill.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;

  const vh = window.innerHeight;
  parallaxImages.forEach((img) => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    // -1 when the section is leaving at the top, +1 when entering at the bottom
    const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
    const range = img.classList.contains("statement-img") ? 60 : 30;
    img.style.translate = `0 ${(-p * range).toFixed(1)}px`;
  });
}

let frameQueued = false;
const queueFrame = () => {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => { frameQueued = false; onFrame(); });
};
window.addEventListener("scroll", queueFrame, { passive: true });
window.addEventListener("resize", queueFrame);
onFrame();

if (motion) {
  // Headlines marked data-split rise word by word from behind a mask.
  document.querySelectorAll("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((word, i) => {
      const w = document.createElement("span");
      w.className = "w";
      const inner = document.createElement("span");
      inner.className = "w-inner";
      inner.textContent = word;
      inner.style.setProperty("--wi", i);
      w.appendChild(inner);
      el.appendChild(w);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.classList.add("split-ready");
    // Headlines at the top of the page animate straight away; others wait to be scrolled into view.
    if (el.closest(".hero, .page-banner")) el.classList.add("is-visible");
  });

  const BLOCKS = [
    ".section-head", ".section-head-row > .btn", ".split-content > p", ".split-content > .vision-callout",
    ".split-content > .btn", ".split-content > .info-card", ".category-head > div:last-child", ".phase",
    ".ecosystem", ".root-value", ".cta-band-text", ".cta-band-actions", ".commitment-grid > div:first-child",
    ".mission-card", ".vision-card", ".formula-card", ".next-gen", ".statement-label", ".statement-quote-icon",
    ".statement-signoff", ".statement-actions", ".form-card", ".aside-card", ".contact-side > .info-card",
    ".footer-grid > *", ".track", ".statement [data-split]",
  ];
  const CASCADE = [
    ".program-cards > *", ".step-cards > li", ".value-tiles > li", ".feature-grid > li", ".partner-grid > li",
    ".program-tiles > li", ".tl-list > li", ".formula li", ".check-list > li",
  ];
  const IMAGES = [".photo-frame", ".program-card-media", ".category-photo", ".aside-photo", ".vision-card-img"];
  const cascadeSel = CASCADE.join(",");
  const targets = new Set(document.querySelectorAll([...BLOCKS, ...CASCADE].join(",")));
  // Images start fully clipped (zero visible area), which the observer reports as never intersecting.
  // So each image is revealed when its parent container scrolls into view.
  const linkedImages = new Map();
  document.querySelectorAll(IMAGES.join(",")).forEach((img) => {
    const parent = img.parentElement;
    if (!linkedImages.has(parent)) linkedImages.set(parent, []);
    linkedImages.get(parent).push(img);
  });

  const io = new IntersectionObserver((entries) => {
    const shown = entries
      .filter((e) => e.isIntersecting)
      .map((e) => e.target)
      .sort((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return Math.round(ra.top - rb.top) || ra.left - rb.left;
      });
    let k = 0;
    shown.forEach((el) => {
      // Items revealed together cascade one after another (child images inherit the same delay).
      if (el.matches(cascadeSel)) el.style.setProperty("--rv-delay", `${Math.min(k++, 7) * 0.09}s`);
      if (targets.has(el)) el.classList.add("is-visible");
      (linkedImages.get(el) || []).forEach((img) => img.classList.add("is-visible"));
      io.unobserve(el);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  new Set([...targets, ...linkedImages.keys()]).forEach((el) => io.observe(el));

  // Hero photo tilts in 3D toward the pointer (desktop mice and trackpads only).
  const heroMedia = document.querySelector(".hero-media");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 993px)");
  if (heroMedia) {
    const photo = heroMedia.querySelector(".hero-photo");
    const card = heroMedia.querySelector(".hero-float");
    heroMedia.addEventListener("pointermove", (e) => {
      if (!finePointer.matches) return;
      const r = heroMedia.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      photo.style.transform = `rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
      card.style.translate = `${(-x * 16).toFixed(1)}px ${(-y * 16).toFixed(1)}px`;
    });
    heroMedia.addEventListener("pointerleave", () => {
      photo.style.transform = "";
      card.style.translate = "";
    });
  }
}
