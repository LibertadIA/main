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

/* ============================================
   WIDGET WHATSAPP CHATBOT
   ============================================ */

// Configuration - À REMPLACER PAR VOTRE NUMÉRO WHATSAPP
const WHATSAPP_CONFIG = {
    // Format: numéro international sans le + (ex: 33612345678 pour la France)
    phoneNumber: '33612345678', // ⚠️ REMPLACER PAR VOTRE NUMÉRO
    defaultMessage: 'Bonjour ! Je souhaite en savoir plus sur vos services d\'automatisation IA.'
};

// Fonction pour obtenir l'heure actuelle au format HH:MM
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Mettre à jour l'heure des messages WhatsApp au chargement
function updateWhatsAppMessageTimes() {
    const currentTime = getCurrentTime();
    const messageTimeElements = document.querySelectorAll('.whatsapp-message-time');

    messageTimeElements.forEach(element => {
        element.textContent = currentTime;
    });
}

// Exécuter la mise à jour de l'heure quand le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateWhatsAppMessageTimes);
} else {
    updateWhatsAppMessageTimes();
}

// Éléments du DOM
const whatsappButton = document.getElementById('whatsapp-button');
const whatsappChatWindow = document.getElementById('whatsapp-chat-window');
const whatsappClose = document.getElementById('whatsapp-close');
const whatsappBadge = document.getElementById('whatsapp-badge');
const quickReplyButtons = document.querySelectorAll('.whatsapp-quick-reply');

// État du widget
let isChatOpen = false;

// Fonction pour ouvrir/fermer le chat
function toggleChat() {
    isChatOpen = !isChatOpen;

    if (isChatOpen) {
        whatsappChatWindow.classList.add('active');
        whatsappBadge.style.display = 'none';
    } else {
        whatsappChatWindow.classList.remove('active');
    }
}

// Fonction pour ouvrir WhatsApp avec un message
function openWhatsApp(message = WHATSAPP_CONFIG.defaultMessage) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}?text=${encodedMessage}`;

    // Ouvrir dans un nouvel onglet
    window.open(whatsappURL, '_blank');

    // Fermer le widget après ouverture
    setTimeout(() => {
        toggleChat();
    }, 500);
}

// Event listeners
if (whatsappButton) {
    whatsappButton.addEventListener('click', toggleChat);
}

if (whatsappClose) {
    whatsappClose.addEventListener('click', toggleChat);
}

// Gérer les clics sur les réponses rapides
if (quickReplyButtons) {
    quickReplyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const message = this.getAttribute('data-message');
            openWhatsApp(message);
        });
    });
}

// Fermer le widget si on clique en dehors
document.addEventListener('click', function(event) {
    if (isChatOpen &&
        !whatsappChatWindow.contains(event.target) &&
        !whatsappButton.contains(event.target)) {
        toggleChat();
    }
});

// Afficher le badge après 3 secondes (pour attirer l'attention)
setTimeout(() => {
    if (whatsappBadge && !isChatOpen) {
        whatsappBadge.style.display = 'flex';
    }
}, 3000);

console.log('✅ LibertadIA - JavaScript chargé avec succès');
