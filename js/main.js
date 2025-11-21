/* ============================================
   LIBERTADIA - MAIN JAVASCRIPT
   Gestion de toutes les interactions du site
   ============================================ */

// ============================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initProgressBar();
    initNavigation();
    initScrollAnimations();
    initTabs();
    initROICalculator();
    initCounterAnimations();
    initForms();
});

// ============================================
// BARRE DE PROGRESSION DE SCROLL
// ============================================
function initProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;

    window.addEventListener('scroll', function() {
        const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const header = document.getElementById('header');
    
    // Menu hamburger mobile
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
        });

        // Fermer le menu en cliquant sur un lien
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // Effet au scroll sur le header
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
}

// ============================================
// ANIMATIONS AU SCROLL
// ============================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observer tous les éléments avec la classe animate-on-scroll
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// ============================================
// SYSTÈME D'ONGLETS
// ============================================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    if (tabButtons.length === 0) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Retirer la classe active de tous les boutons et panneaux
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Ajouter la classe active au bouton et panneau sélectionnés
            this.classList.add('active');
            const targetPanel = document.querySelector(`[data-panel="${targetTab}"]`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// ============================================
// CALCULATEUR ROI INTERACTIF
// ============================================
function initROICalculator() {
    const costPerHourInput = document.getElementById('costPerHour');
    const costPerHourRange = document.getElementById('costPerHourRange');
    const hoursPerWeekInput = document.getElementById('hoursPerWeek');
    const hoursPerWeekRange = document.getElementById('hoursPerWeekRange');
    const automationRateInput = document.getElementById('automationRate');
    const automationRateRange = document.getElementById('automationRateRange');

    if (!costPerHourInput) return;

    // Synchroniser les inputs avec les sliders
    function syncInputs(input, range) {
        input.addEventListener('input', function() {
            range.value = this.value;
            calculateROI();
        });
        range.addEventListener('input', function() {
            input.value = this.value;
            calculateROI();
        });
    }

    syncInputs(costPerHourInput, costPerHourRange);
    syncInputs(hoursPerWeekInput, hoursPerWeekRange);
    syncInputs(automationRateInput, automationRateRange);

    // Fonction de calcul du ROI
    function calculateROI() {
        const costPerHour = parseFloat(costPerHourInput.value) || 0;
        const hoursPerWeek = parseFloat(hoursPerWeekInput.value) || 0;
        const automationRate = parseFloat(automationRateInput.value) || 0;

        // Calcul des heures libérées par mois
        const hoursFreedPerMonth = (hoursPerWeek * 4.33 * automationRate) / 100;
        
        // Calcul de l'économie mensuelle
        const monthlySavings = hoursFreedPerMonth * costPerHour;
        
        // Calcul de l'économie annuelle
        const yearlySavings = monthlySavings * 12;

        // Mise à jour des affichages avec animation
        animateValue('monthlySavings', monthlySavings, '€');
        animateValue('yearlySavings', yearlySavings, '€');
        animateValue('hoursFreed', hoursFreedPerMonth, 'heures');

        // Mise à jour de la jauge
        const gaugeFill = document.getElementById('gaugeFill');
        if (gaugeFill) {
            const gaugePercent = Math.min((monthlySavings / 5000) * 100, 100);
            gaugeFill.style.width = gaugePercent + '%';
        }
    }

    // Animation des valeurs
    function animateValue(elementId, finalValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseFloat(element.textContent.replace(/[^\d.-]/g, '')) || 0;
        const duration = 800;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Fonction d'easing
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (finalValue - startValue) * easeOutQuart;

            if (suffix === '€') {
                element.textContent = Math.round(currentValue).toLocaleString('fr-FR') + ' €';
            } else if (suffix === 'heures') {
                element.textContent = Math.round(currentValue) + ' heures';
            } else {
                element.textContent = Math.round(currentValue);
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // Calcul initial
    calculateROI();
}

// ============================================
// ANIMATIONS DE COMPTEUR
// ============================================
function initCounterAnimations() {
    const counters = document.querySelectorAll('[data-target]');
    
    if (counters.length === 0) return;

    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-target'));
                animateCounter(counter, target);
                observer.unobserve(counter);
            }
        });
    }, observerOptions);

    counters.forEach(counter => observer.observe(counter));

    function animateCounter(element, target) {
        const duration = 2000;
        const startTime = performance.now();
        const startValue = 0;

        function update(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue + (target - startValue) * easeOutQuart);

            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target;
            }
        }

        requestAnimationFrame(update);
    }
}

// ============================================
// GESTION DES FORMULAIRES
// ============================================
function initForms() {
    // Formulaire CTA sur la page d'accueil
    const ctaForm = document.getElementById('ctaForm');
    if (ctaForm) {
        ctaForm.addEventListener('submit', handleFormSubmit);
    }

    // Formulaire de contact
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }

    // Validation en temps réel
    const formInputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
    formInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateInput(this);
        });
    });
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validation
    let isValid = true;
    const inputs = form.querySelectorAll('[required]');
    inputs.forEach(input => {
        if (!validateInput(input)) {
            isValid = false;
        }
    });

    if (!isValid) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    // Simulation d'envoi (à remplacer par votre vraie logique d'envoi)
    console.log('Form submitted:', Object.fromEntries(formData));
    
    // Afficher le message de succès
    showFormSuccess(form);
}

function validateInput(input) {
    const value = input.value.trim();
    let isValid = true;

    if (input.hasAttribute('required') && !value) {
        isValid = false;
        input.style.borderColor = '#DC2626';
    } else if (input.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
        input.style.borderColor = '#DC2626';
    } else {
        input.style.borderColor = '';
    }

    return isValid;
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function showFormSuccess(form) {
    // Cacher le formulaire
    form.style.display = 'none';
    
    // Afficher le message de succès
    const formSuccess = document.getElementById('formSuccess');
    if (formSuccess) {
        formSuccess.style.display = 'block';
        
        // Animation d'apparition
        formSuccess.style.opacity = '0';
        formSuccess.style.transform = 'scale(0.9)';
        formSuccess.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            formSuccess.style.opacity = '1';
            formSuccess.style.transform = 'scale(1)';
        }, 10);

        // Reset après 5 secondes (optionnel)
        setTimeout(() => {
            form.reset();
            form.style.display = 'block';
            formSuccess.style.display = 'none';
        }, 5000);
    }
}

// ============================================
// SMOOTH SCROLL POUR LES ANCRES
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            const headerHeight = document.getElementById('header')?.offsetHeight || 0;
            const targetPosition = target.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// TOOLTIPS
// ============================================
document.querySelectorAll('[data-tooltip]').forEach(element => {
    element.addEventListener('mouseenter', function() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = this.getAttribute('data-tooltip');
        tooltip.style.cssText = `
            position: absolute;
            background: #1F2937;
            color: white;
            padding: 0.5rem 0.75rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            max-width: 200px;
            z-index: 1000;
            pointer-events: none;
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = this.getBoundingClientRect();
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        
        this._tooltip = tooltip;
    });
    
    element.addEventListener('mouseleave', function() {
        if (this._tooltip) {
            this._tooltip.remove();
            this._tooltip = null;
        }
    });
});

console.log('✅ LibertadIA - JavaScript chargé avec succès');
