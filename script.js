// ============================================
// CONFIGURATION & VARIABLES
// ============================================

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Timeout de sécurité : si GSAP ne charge pas en 3 secondes, afficher le contenu
setTimeout(function() {
    if (typeof gsap === 'undefined') {
        console.warn('⚠️ GSAP timeout - affichage du contenu sans animations');
        makeAllVisibleFallback();
    }
}, 3000);

function makeAllVisibleFallback() {
    const elements = document.querySelectorAll('.hero-title-new, .hero-subtitle-new, .hero-cta-new, .hero-trust, .automation-svg, .comparison-side, .roi-card, .cta-content-wrapper');
    elements.forEach(el => {
        if (el && window.getComputedStyle(el).opacity === '0') {
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.visibility = 'visible';
        }
    });
}

// ============================================
// GSAP CONFIGURATION & ANIMATIONS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Marquer que JS est chargé
    document.documentElement.classList.add('js-loaded');

    // Enregistrer ScrollTrigger
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Configuration GSAP
        if (!prefersReducedMotion) {
            initGSAPAnimations();
        } else {
            // Si reduced motion, assurer que tout est visible
            makeAllVisible();
        }
    } else {
        // Si GSAP ne charge pas, assurer que tout est visible
        console.warn('GSAP non chargé - animations désactivées mais contenu visible');
        makeAllVisible();
    }

    // Initialiser les autres fonctionnalités
    initMobileNav();
    initScrollReveal();
    initROICounters();
    initSmoothScroll();
    initContactForm();
    initNavbarScroll();

    // PACK IMMERSION ULTRA - Nouvelles fonctionnalités
    initScrollProgress();
    initFloatingParticlesParallax();
    initCursorGlow();
    initSmoothScrollEnhanced();
    initSectionBackgroundChange();
    initEnhancedRevealAnimations();
});

// Fonction pour rendre tout visible si GSAP échoue
function makeAllVisible() {
    const elements = document.querySelectorAll('.hero-title-new, .hero-subtitle-new, .hero-cta-new, .hero-trust, .automation-svg');
    elements.forEach(el => {
        if (el) {
            el.style.opacity = '1';
            el.style.transform = 'none';
        }
    });
}

// ============================================
// ANIMATIONS GSAP
// ============================================

function initGSAPAnimations() {
    // S'assurer que les éléments existent avant d'animer
    const heroTitle = document.querySelector('.hero-title-new');
    const heroSubtitle = document.querySelector('.hero-subtitle-new');
    const heroCTA = document.querySelectorAll('.hero-cta-new a');
    const trustItems = document.querySelectorAll('.hero-trust .trust-item');
    const autoSVG = document.querySelector('.automation-svg');

    // Animation du Hero au chargement
    if (heroTitle) {
        gsap.from(heroTitle, {
            duration: 1,
            y: 50,
            opacity: 0,
            ease: 'power3.out',
            clearProps: 'all' // Nettoyer les props inline après animation
        });
    }

    if (heroSubtitle) {
        gsap.from(heroSubtitle, {
            duration: 1,
            y: 30,
            opacity: 0,
            delay: 0.2,
            ease: 'power3.out',
            clearProps: 'all'
        });
    }

    if (heroCTA.length > 0) {
        gsap.from(heroCTA, {
            duration: 0.8,
            y: 20,
            opacity: 0,
            stagger: 0.2,
            delay: 0.4,
            ease: 'power3.out',
            clearProps: 'all'
        });
    }

    if (trustItems.length > 0) {
        gsap.from(trustItems, {
            duration: 0.6,
            y: 20,
            opacity: 0,
            stagger: 0.1,
            delay: 0.8,
            ease: 'power2.out',
            clearProps: 'all'
        });
    }

    // Animation du SVG d'automatisation
    if (autoSVG) {
        gsap.from(autoSVG, {
            duration: 1.2,
            scale: 0.8,
            opacity: 0,
            delay: 0.3,
            ease: 'back.out(1.7)',
            clearProps: 'all'
        });
    }

    // Animations au scroll avec ScrollTrigger

    // Section Problème/Solution
    const comparisonSides = document.querySelectorAll('.comparison-side');
    if (comparisonSides.length > 0) {
        comparisonSides.forEach((el, index) => {
            gsap.from(el, {
                scrollTrigger: {
                    trigger: el,
                    start: 'top 80%',
                    end: 'top 50%',
                    toggleActions: 'play none none none' // Ne pas reverse pour garder visible
                },
                duration: 0.8,
                y: 50,
                opacity: 0,
                delay: index * 0.2,
                ease: 'power2.out',
                clearProps: 'all'
            });
        });
    }

    // Animation de la flèche de transition
    const transitionArrow = document.querySelector('.transition-arrow');
    if (transitionArrow) {
        gsap.from(transitionArrow, {
            scrollTrigger: {
                trigger: transitionArrow,
                start: 'top 80%',
                toggleActions: 'play none none none'
            },
            duration: 0.6,
            scale: 0,
            opacity: 0,
            ease: 'back.out(1.7)',
            clearProps: 'all'
        });
    }

    // Section ROI - Animation des cartes
    const roiCards = document.querySelectorAll('.roi-card');
    if (roiCards.length > 0) {
        roiCards.forEach((card, index) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                },
                duration: 0.8,
                y: 60,
                opacity: 0,
                scale: 0.9,
                delay: index * 0.15,
                ease: 'power3.out',
                clearProps: 'all'
            });
        });
    }

    // Animation du CTA final
    const ctaWrapper = document.querySelector('.cta-content-wrapper');
    if (ctaWrapper) {
        gsap.from(ctaWrapper, {
            scrollTrigger: {
                trigger: '.final-cta',
                start: 'top 70%',
                toggleActions: 'play none none none'
            },
            duration: 1,
            y: 50,
            opacity: 0,
            ease: 'power3.out',
            clearProps: 'all'
        });
    }

    // Animation des cercles de fond du hero avec parallax
    const bgCircles = document.querySelectorAll('.bg-circle');
    if (bgCircles.length > 0) {
        bgCircles.forEach((circle, index) => {
            gsap.to(circle, {
                scrollTrigger: {
                    trigger: '.hero-new',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1 // Smooth scrub
                },
                y: index * 100 + 50,
                ease: 'none'
            });
        });
    }

    console.log('✅ Animations GSAP initialisées avec succès!');
}

// ============================================
// SCROLL REVEAL (Intersection Observer)
// ============================================

function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    if (revealElements.length === 0) return;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, delay);

                // Ne plus observer après révélation
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => {
        if (!prefersReducedMotion) {
            observer.observe(el);
        } else {
            // Si l'utilisateur préfère moins d'animations, révéler directement
            el.classList.add('revealed');
        }
    });
}

// ============================================
// COMPTEURS ANIMÉS ROI
// ============================================

function initROICounters() {
    const counters = document.querySelectorAll('.roi-number');
    let countersAnimated = false;

    if (counters.length === 0) return;

    const observerOptions = {
        threshold: 0.5
    };

    const counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !countersAnimated) {
                animateCounters();
                countersAnimated = true;
            }
        });
    }, observerOptions);

    const roiSection = document.querySelector('.roi-section');
    if (roiSection) {
        counterObserver.observe(roiSection);
    }

    function animateCounters() {
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.target);
            const duration = 2000; // 2 secondes
            const start = 0;
            const increment = target / (duration / 16); // 60 FPS
            let current = start;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 16);
        });
    }
}

// ============================================
// NAVIGATION MOBILE
// ============================================

function initMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        this.classList.toggle('active');
    });

    // Fermer le menu en cliquant sur un lien
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });

    // Fermer le menu en cliquant en dehors
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
}

// ============================================
// SMOOTH SCROLL
// ============================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Ignorer les liens vides ou juste "#"
            if (!href || href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.offsetTop - 80; // Hauteur de la navbar

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// NAVBAR AU SCROLL
// ============================================

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    if (!navbar) return;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Ajouter une ombre plus prononcée au scroll
        if (currentScroll > 100) {
            navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        }

        lastScroll = currentScroll;
    });
}

// ============================================
// FORMULAIRE DE CONTACT
// ============================================

function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');

    if (!contactForm) return;

    // Validation en temps réel des champs
    const formInputs = contactForm.querySelectorAll('input, select, textarea');

    formInputs.forEach(input => {
        // Validation au blur
        input.addEventListener('blur', function() {
            validateField(this);
        });

        // Retirer la bordure d'erreur au focus
        input.addEventListener('focus', function() {
            this.style.borderColor = 'var(--primary-color)';
        });

        // Validation en temps réel pour l'email
        if (input.type === 'email') {
            input.addEventListener('input', function() {
                validateEmail(this);
            });
        }
    });

    // Formatage du téléphone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            if (value.length > 0) {
                value = value.match(/.{1,2}/g).join(' ');
                e.target.value = value;
            }
        });
    }

    // Soumission du formulaire
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validation complète
        let isValid = true;
        formInputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            return;
        }

        // Récupérer les données du formulaire
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);

        console.log('Formulaire soumis:', data);

        // Afficher le message de succès
        contactForm.style.display = 'none';
        if (formSuccess) {
            formSuccess.classList.add('show');

            // Réinitialiser après 5 secondes
            setTimeout(() => {
                contactForm.reset();
                contactForm.style.display = 'block';
                formSuccess.classList.remove('show');
            }, 5000);
        }

        // Dans un environnement de production, envoyer les données à un serveur:
        /*
        fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            contactForm.style.display = 'none';
            formSuccess.classList.add('show');
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
        });
        */
    });
}

// Fonction de validation de champ
function validateField(field) {
    if (!field.hasAttribute('required')) return true;

    const value = field.value.trim();

    if (!value) {
        field.style.borderColor = 'var(--red-color)';
        return false;
    }

    if (field.type === 'email') {
        return validateEmail(field);
    }

    field.style.borderColor = 'var(--green-color)';
    return true;
}

// Validation email
function validateEmail(field) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const value = field.value.trim();

    if (value && !emailRegex.test(value)) {
        field.style.borderColor = 'var(--red-color)';
        return false;
    }

    if (value) {
        field.style.borderColor = 'var(--green-color)';
    }
    return true;
}

// ============================================
// MICRO-INTERACTIONS
// ============================================

// Effet ripple sur les boutons
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.btn-cta-primary, .btn-cta-secondary, .btn-cta-large, .btn-cta-outline, .btn-nav');

    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// ============================================
// CSS DYNAMIQUE POUR LES ANIMATIONS
// ============================================

const style = document.createElement('style');
style.textContent = `
    /* Ripple effect */
    .btn-cta-primary,
    .btn-cta-secondary,
    .btn-cta-large,
    .btn-cta-outline,
    .btn-nav {
        position: relative;
        overflow: hidden;
    }

    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }

    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    /* Animation du hamburger */
    .hamburger.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }

    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }

    .hamburger.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }

    /* Amélioration des transitions pour les icônes de comparaison */
    .comparison-icon {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }

    /* Pulse au hover pour les cartes ROI */
    .roi-card:hover .roi-icon {
        animation: iconPulse 0.6s ease-in-out;
    }

    @keyframes iconPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }

    /* Animation du gradient dans le CTA final */
    .cta-gradient-bg {
        will-change: background-position;
    }

    /* Optimisation des performances pour les animations */
    .automation-svg,
    .node,
    .connection,
    .data-particle {
        will-change: transform, opacity;
    }

    /* Amélioration de l'accessibilité - Focus visible */
    a:focus-visible,
    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
        outline: 3px solid var(--primary-color);
        outline-offset: 2px;
    }
`;

document.head.appendChild(style);

// ============================================
// PERFORMANCE MONITORING (Development)
// ============================================

if (typeof performance !== 'undefined' && console) {
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log(`⚡ Page Load Time: ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`);
                console.log(`🎨 DOM Content Loaded: ${Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart)}ms`);
            }
        }, 0);
    });
}

// ============================================
// LAZY LOADING POUR LES ANIMATIONS COMPLEXES
// ============================================

// Charger les animations complexes uniquement si l'utilisateur scrolle
let complexAnimationsLoaded = false;

window.addEventListener('scroll', function() {
    if (!complexAnimationsLoaded && window.scrollY > 100) {
        complexAnimationsLoaded = true;
        // Charger des animations supplémentaires si nécessaire
    }
}, { passive: true });

// ============================================
// GESTION DES ERREURS
// ============================================

window.addEventListener('error', function(e) {
    console.error('Erreur détectée:', e.message);
    // En production, envoyer à un service de monitoring
});

// ============================================
// PACK IMMERSION ULTRA - FONCTIONNALITÉS AVANCÉES
// ============================================

// 1. Progress Bar avec pourcentage
function initScrollProgress() {
    const progressBar = document.querySelector('.scroll-progress-bar');
    const progressPercentage = document.querySelector('.scroll-progress-percentage');

    if (!progressBar || !progressPercentage) return;

    window.addEventListener('scroll', function() {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;

        progressBar.style.width = scrolled + '%';
        progressPercentage.textContent = Math.round(scrolled) + '%';

        // Changer la couleur du badge selon le scroll
        if (scrolled < 25) {
            progressPercentage.style.background = 'rgba(37, 99, 235, 0.95)'; // Bleu
        } else if (scrolled < 50) {
            progressPercentage.style.background = 'rgba(6, 182, 212, 0.95)'; // Cyan
        } else if (scrolled < 75) {
            progressPercentage.style.background = 'rgba(249, 115, 22, 0.95)'; // Orange
        } else {
            progressPercentage.style.background = 'rgba(16, 185, 129, 0.95)'; // Vert
        }
    }, { passive: true });
}

// 2. Particules flottantes avec effet parallax
function initFloatingParticlesParallax() {
    const particles = document.querySelectorAll('.particle');

    if (particles.length === 0 || prefersReducedMotion) return;

    let ticking = false;

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                const scrollY = window.scrollY;

                particles.forEach((particle, index) => {
                    // Vitesse différente pour chaque particule (effet parallax)
                    const speed = 0.1 + (index * 0.05);
                    const yPos = -(scrollY * speed);

                    particle.style.transform = `translateY(${yPos}px)`;
                });

                ticking = false;
            });

            ticking = true;
        }
    }, { passive: true });
}

// 3. Cursor Glow Effect
function initCursorGlow() {
    const cursorGlow = document.querySelector('.cursor-glow');

    if (!cursorGlow || prefersReducedMotion) return;

    // Désactiver sur mobile/tablette
    if (window.matchMedia('(max-width: 768px)').matches) return;

    let mouseX = 0;
    let mouseY = 0;
    let glowX = 0;
    let glowY = 0;

    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Animation fluide avec requestAnimationFrame
    function animateGlow() {
        // Smooth suivit du curseur (easing)
        glowX += (mouseX - glowX) * 0.15;
        glowY += (mouseY - glowY) * 0.15;

        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';

        requestAnimationFrame(animateGlow);
    }

    animateGlow();

    // Agrandir le glow au survol de liens et boutons
    const interactiveElements = document.querySelectorAll('a, button, .btn-cta-primary, .btn-cta-secondary');

    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', function() {
            cursorGlow.style.width = '500px';
            cursorGlow.style.height = '500px';
            cursorGlow.style.opacity = '1';
        });

        el.addEventListener('mouseleave', function() {
            cursorGlow.style.width = '400px';
            cursorGlow.style.height = '400px';
            cursorGlow.style.opacity = '0.8';
        });
    });
}

// 4. Smooth Scroll Amélioré avec easing personnalisé
function initSmoothScrollEnhanced() {
    if (prefersReducedMotion) return;

    // Smooth scroll personnalisé pour tous les liens d'ancrage
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Ignorer les liens vides
            if (!href || href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                // Utiliser scrollIntoView avec smooth behavior
                const navbarHeight = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 5. Changement de couleur du background par section au scroll
function initSectionBackgroundChange() {
    const sections = document.querySelectorAll('section[data-bg-color]');

    if (sections.length === 0 || prefersReducedMotion) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bgColor = entry.target.getAttribute('data-bg-color');
                document.body.style.backgroundColor = bgColor;
            }
        });
    }, {
        threshold: 0.3 // Déclencher quand 30% de la section est visible
    });

    sections.forEach(section => observer.observe(section));
}

// 6. Reveal Animations Améliorées (fade + slide + scale)
function initEnhancedRevealAnimations() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    if (revealElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Ne plus observer après révélation pour performance
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15, // Déclencher quand 15% visible
        rootMargin: '0px 0px -50px 0px' // Offset du bas
    });

    revealElements.forEach(el => observer.observe(el));
}

console.log('🚀 LibertadIA - Site chargé avec succès');
console.log('✨ Pack Immersion Ultra activé');
console.log('💡 GSAP et animations activés');
