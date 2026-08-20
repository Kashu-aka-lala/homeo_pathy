/**
 * Yashfeen Homeopathy - Landing Page Core Script
 * Features: Light/Dark Mode toggle, mobile menu, FAQ accordion, scroll spy, and reveal animations.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  const CLINIC_CONFIG = {
    phone: '+923001234567', // Standard Clinic Contact Phone
    whatsapp: '923001234567', // WhatsApp number (country code prefix, no +, no spaces)
    defaultMessage: 'Hi Yashfeen Homeopathy, I would like to schedule an appointment/consultation.',
    emrLocalUrl: 'http://localhost:3000',
    emrProdUrl: 'https://app.yashfeenhomeopathy.online'
  };

  // Dynamically update contact links if elements exist
  const waHeroCta = document.getElementById('wa-hero-cta');
  const waServicesCta = document.getElementById('wa-services-cta');
  const phoneLink = document.getElementById('phone-link');

  if (waHeroCta) {
    waHeroCta.href = `https://wa.me/${CLINIC_CONFIG.whatsapp}?text=${encodeURIComponent(CLINIC_CONFIG.defaultMessage)}`;
  }
  if (waServicesCta) {
    waServicesCta.href = `https://wa.me/${CLINIC_CONFIG.whatsapp}?text=${encodeURIComponent(CLINIC_CONFIG.defaultMessage)}`;
  }
  if (phoneLink) {
    phoneLink.href = `tel:${CLINIC_CONFIG.phone}`;
    phoneLink.textContent = CLINIC_CONFIG.phone.replace(/(\+\d{2})(\d{3})(\d{7})/, '$1 ($2) $3');
  }


  // ==========================================================================
  // LIGHT / DARK THEME TOGGLE
  // ==========================================================================
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  const body = document.body;

  // Check localStorage for theme preference
  const savedTheme = localStorage.getItem('yashfeen_theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    enableDarkMode();
  } else {
    enableLightMode();
  }

  themeToggleBtn.addEventListener('click', () => {
    if (body.classList.contains('dark-mode')) {
      enableLightMode();
    } else {
      enableDarkMode();
    }
  });

  function enableDarkMode() {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
    localStorage.setItem('yashfeen_theme', 'dark');
  }

  function enableLightMode() {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    moonIcon.classList.add('hidden');
    sunIcon.classList.remove('hidden');
    localStorage.setItem('yashfeen_theme', 'light');
  }


  // ==========================================================================
  // MOBILE NAVIGATION DRAWER
  // ==========================================================================
  const menuToggle = document.getElementById('menu-toggle');
  const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileNavOverlay.classList.toggle('active');
  });

  // Close mobile nav when link is clicked
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      mobileNavOverlay.classList.remove('active');
    });
  });


  // ==========================================================================
  // SCROLL-REVEAL ON SCROLL INTERSECTION OBSERVER
  // ==========================================================================
  const revealElements = document.querySelectorAll('.scroll-reveal');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Once revealed, no need to keep observing this element
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });


  // ==========================================================================
  // SCROLL STATE HEADER & SCROLL SPY ACTIVE LINKS
  // ==========================================================================
  const header = document.getElementById('main-header');
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    // Header shadow on scroll
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Scroll spy link activation
    let currentSectionId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    if (currentSectionId) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSectionId}`) {
          link.classList.add('active');
        }
      });
    }
  });


  // ==========================================================================
  // FAQ ACCORDION INTERACTIVITY
  // ==========================================================================
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const answer = question.nextElementSibling;
      const isExpanded = question.getAttribute('aria-expanded') === 'true';

      // Close all other FAQs
      faqQuestions.forEach(otherQuestion => {
        if (otherQuestion !== question) {
          otherQuestion.setAttribute('aria-expanded', 'false');
          otherQuestion.nextElementSibling.style.maxHeight = null;
        }
      });

      // Toggle current FAQ
      if (isExpanded) {
        question.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = null;
      } else {
        question.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

});
