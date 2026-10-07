/* AIMS site behaviour (shared by every page) */

// Contact details shown in the footer and contact page, and used by the forms.
// Replace these with the real AIMS contact details before going live.
// Leave whatsapp or phone empty ("") to hide them. WhatsApp: digits only, with country code, e.g. "639171234567".
const CONFIG = {
  email: "admissions@example.com",
  whatsapp: "",
  phone: "",
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Header + mobile nav ---------- */

const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");

const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const setNav = (open) => {
  nav.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
};
navToggle.addEventListener("click", () => setNav(navToggle.getAttribute("aria-expanded") !== "true"));
nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); navToggle.focus(); }
});

/* ---------- Core purpose staircase (home page) ---------- */

const stairs = document.querySelector("[data-stairs]");

if (stairs) {
  const svg = stairs.querySelector("[data-stairs-svg]");
  const path = stairs.querySelector("[data-stairs-path]");
  const NS = "http://www.w3.org/2000/svg";

  const drawStairs = () => {
    const box = stairs.getBoundingClientRect();
    const words = [...stairs.querySelectorAll(".step-word")];
    // A node sits just left of each word, centred on its x-height.
    const pts = words.map((w) => {
      const r = w.getBoundingClientRect();
      return { x: r.left - box.left - 20, y: r.top - box.top + r.height * 0.56 };
    });

    // Rise vertically out of each node, then turn toward the next: the curve
    // stays clear of the word it leaves and of the word it arrives at.
    let d = `M ${pts[0].x} ${pts[0].y + 40} L ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      d += ` Q ${a.x} ${b.y} ${b.x} ${b.y}`;
    }
    path.setAttribute("d", d);

    svg.querySelectorAll("circle").forEach((c) => c.remove());
    pts.forEach((p, i) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", p.x);
      c.setAttribute("cy", p.y);
      c.setAttribute("r", i === pts.length - 1 ? 7 : 5);
      if (i < pts.length - 1) c.setAttribute("class", "node-ring");
      svg.appendChild(c);
    });

    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    if (!stairs.classList.contains("is-drawn") && stairs.classList.contains("is-armed")) {
      path.style.strokeDashoffset = len;
    }
  };

  const revealStairs = () => {
    stairs.classList.add("is-drawn");
    path.style.transition = "stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1)";
    path.style.strokeDashoffset = 0;
  };

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    if (!reduceMotion && "IntersectionObserver" in window) {
      stairs.classList.add("is-armed");
      drawStairs();
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { revealStairs(); io.disconnect(); }
      }, { threshold: 0.45 });
      io.observe(stairs);
    } else {
      drawStairs();
    }
    let raf;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        path.style.transition = "none";
        drawStairs();
      });
    });
  });
}

/* ---------- Forms ---------- */

const required = (msg) => (v) => (v.trim().length >= 2 ? "" : msg);
const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const FORMS = {
  counseling: {
    rules: {
      name: required("Enter your full name."),
      country: required("Enter the country you live in."),
      program: (v) => (v ? "" : "Choose a program, or pick “I'm not sure yet”."),
      contact: (v) => {
        const s = v.trim();
        if (!s) return "Enter an email address or a WhatsApp number so we can reply.";
        if (s.includes("@")) return emailOk(s) ? "" : "Check the email address. It should look like name@example.com.";
        return s.replace(/\D/g, "").length >= 7 ? "" : "Check the number. Include your country code, for example +63 917 123 4567.";
      },
    },
    compose: (f) => ({
      subject: `Counseling request: ${f.name.value.trim()}`,
      body: [
        `Name: ${f.name.value.trim()}`,
        `Country: ${f.country.value.trim()}`,
        `Program: ${f.program.value}`,
        `Contact: ${f.contact.value.trim()}`,
        f.parent.checked ? "Enquiring as: parent or guardian" : "Enquiring as: student",
        "",
        "Please contact me about counseling.",
      ].join("\n"),
    }),
  },
  partner: {
    rules: {
      org: required("Enter the name of your institution or organization."),
      type: (v) => (v ? "" : "Choose the type of organization."),
      name: required("Enter your name."),
      country: required("Enter your country."),
      email: (v) => (emailOk(v.trim()) ? "" : "Enter a work email address, like name@university.edu."),
    },
    compose: (f) => ({
      subject: `Partnership enquiry: ${f.org.value.trim()}`,
      body: [
        `Organization: ${f.org.value.trim()}`,
        `Type: ${f.type.value}`,
        `Contact person: ${f.name.value.trim()}`,
        `Country: ${f.country.value.trim()}`,
        `Email: ${f.email.value.trim()}`,
        "",
        f.message.value.trim() || "We would like to discuss a partnership with AIMS.",
      ].join("\n"),
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

function mailto(subject, body) {
  return `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

document.querySelectorAll("[data-form]").forEach((form) => {
  const spec = FORMS[form.dataset.form];
  const card = form.closest("[data-form-card]");
  const formView = card.querySelector("[data-form-view]");
  const doneView = card.querySelector("[data-form-done]");
  const f = form.elements;

  Object.entries(spec.rules).forEach(([name, rule]) => {
    const field = f[name];
    if (field.tagName === "SELECT") {
      field.addEventListener("change", () => { const m = rule(field.value); m ? setError(field, m) : clearError(field); });
    } else {
      field.addEventListener("blur", () => {
        if (field.getAttribute("aria-invalid") === "true") { const m = rule(field.value); m ? setError(field, m) : clearError(field); }
      });
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true" && !rule(field.value)) clearError(field);
      });
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let firstBad = null;
    Object.entries(spec.rules).forEach(([name, rule]) => {
      const m = rule(f[name].value);
      if (m) { setError(f[name], m); firstBad ||= f[name]; } else clearError(f[name]);
    });
    if (firstBad) { firstBad.focus(); return; }

    const { subject, body } = spec.compose(f);
    window.location.href = mailto(subject, body);

    const alt = doneView.querySelector("[data-done-alt]");
    const mail = document.createElement("a");
    mail.href = mailto(subject, body);
    mail.textContent = CONFIG.email;
    const parts = [document.createTextNode("Email app didn't open? Write to "), mail];
    if (CONFIG.whatsapp && form.dataset.form === "counseling") {
      const wa = document.createElement("a");
      wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(body)}`;
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.textContent = "send it on WhatsApp";
      parts.push(document.createTextNode(", or "), wa);
    }
    parts.push(document.createTextNode("."));
    alt.replaceChildren(...parts);

    formView.hidden = true;
    doneView.hidden = false;
    doneView.focus();
  });

  doneView.querySelector("[data-form-edit]").addEventListener("click", () => {
    doneView.hidden = true;
    formView.hidden = false;
    form.querySelector("input, select").focus();
  });
});

// Arriving from a program link (contact.html?program=Nursing) pre-selects it.
const programSelect = document.getElementById("f-program");
const wanted = new URLSearchParams(location.search).get("program");
if (programSelect && wanted && [...programSelect.options].some((o) => o.value === wanted)) {
  programSelect.value = wanted;
  programSelect.classList.add("just-set");
  const name = document.getElementById("f-name");
  if (name) name.focus({ preventScroll: true });
}

/* ---------- Contact details + year ---------- */

const contactItems = [
  CONFIG.email && { href: `mailto:${CONFIG.email}`, label: "Email", text: CONFIG.email },
  CONFIG.phone && { href: `tel:${CONFIG.phone.replace(/[^\d+]/g, "")}`, label: "Phone", text: CONFIG.phone },
  CONFIG.whatsapp && { href: `https://wa.me/${CONFIG.whatsapp}`, label: "WhatsApp", text: `+${CONFIG.whatsapp}` },
].filter(Boolean);

document.querySelectorAll("[data-contact-list]").forEach((list) => {
  const detailed = list.classList.contains("contact-direct");
  contactItems.forEach(({ href, label, text }) => {
    const li = document.createElement("li");
    if (detailed) {
      const l = document.createElement("span");
      l.className = "contact-label";
      l.textContent = label;
      li.appendChild(l);
    }
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    li.appendChild(a);
    list.appendChild(li);
  });
});

document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
