/* ============================================
   HERO ANIMATION JAVASCRIPT - LibertadIA
   Animations GSAP sophistiquées pour l'automatisation IA
   ============================================ */

(function() {
  'use strict';

  // Vérifier que GSAP est chargé
  if (typeof gsap === 'undefined') {
    console.error('❌ GSAP not loaded. Hero animation disabled.');
    return;
  }

  // Respect de prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    console.log('⚠️ Reduced motion preferred - Simplified animations');
    // Rendre tout visible immédiatement
    document.querySelectorAll('.connection-line, .particle, .input-node, .output-node, #central-processor').forEach(el => {
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
    return;
  }

  // ============================================
  // CONFIGURATION
  // ============================================
  const config = {
    particleSpeed: 3.5, // Durée en secondes pour un cycle complet (plus rapide = plus spectaculaire)
    staggerDelay: 0.08,
    entryDuration: 0.6,
    lineDrawDuration: 1.2,
    processorPulseDuration: 2
  };

  // ============================================
  // INITIALISATION AU CHARGEMENT
  // ============================================
  function initHeroAnimation() {
    console.log('🎨 Initialisation Hero Animation');

    // Enregistrer les plugins GSAP
    if (typeof MotionPathPlugin !== 'undefined') {
      gsap.registerPlugin(MotionPathPlugin);
    }

    // Timeline principale d'entrée
    const masterTimeline = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => {
        console.log('✅ Hero Animation: Entrée terminée');
        startContinuousAnimations();
      }
    });

    // ============================================
    // SÉQUENCE D'ENTRÉE
    // ============================================

    // 1. Apparition des nœuds d'entrée (gauche)
    masterTimeline.from('.input-node', {
      duration: config.entryDuration,
      scale: 0,
      opacity: 0,
      stagger: config.staggerDelay,
      ease: 'back.out(1.7)',
      transformOrigin: 'center'
    });

    // 2. Apparition du processeur central (avec effet spectaculaire)
    masterTimeline.from('#central-processor', {
      duration: 1,
      scale: 0,
      rotation: -180,
      opacity: 0,
      ease: 'elastic.out(1, 0.5)',
      transformOrigin: '400px 310px'
    }, '-=0.4'); // Overlap de 0.4s

    // 3. Apparition des nœuds de sortie (droite)
    masterTimeline.from('.output-node', {
      duration: config.entryDuration,
      scale: 0,
      opacity: 0,
      stagger: config.staggerDelay,
      ease: 'back.out(1.7)',
      transformOrigin: 'center'
    }, '-=0.6');

    // 4. Dessin des lignes de connexion
    masterTimeline.to('.connection-line', {
      duration: config.lineDrawDuration,
      strokeDashoffset: 0,
      opacity: 1,
      stagger: 0.15,
      ease: 'power2.inOut'
    }, '-=0.3');

    // 5. Apparition des particules
    masterTimeline.to('.particle', {
      duration: 0.5,
      opacity: 1,
      stagger: 0.1,
      ease: 'power2.out'
    }, '-=0.5');
  }

  // ============================================
  // ANIMATIONS CONTINUES (Boucle infinie)
  // ============================================
  function startContinuousAnimations() {
    console.log('🔄 Démarrage animations continues');

    // Animation des particules le long des paths
    animateParticles();

    // Pulsation du processeur central
    animateProcessorPulse();

    // Glow intermittent des nœuds
    animateNodeGlow();

    // Rotation continue du processeur (très subtile)
    animateProcessorRotation();
  }

  // ============================================
  // ANIMATION DES PARTICULES (MotionPath)
  // ============================================
  function animateParticles() {
    // Tableau des particules et leurs paths correspondants (durées RÉDUITES pour plus de spectacle)
    const particlesPaths = [
      { particle: '.particle-1', path: '#connection-path-1', duration: 3.5 },
      { particle: '.particle-2', path: '#connection-path-2', duration: 3.8 },
      { particle: '.particle-3', path: '#connection-path-3', duration: 3.3 },
      { particle: '.particle-4', path: '#connection-path-4', duration: 3.6 },
      { particle: '.particle-5', path: '#connection-path-5', duration: 3.2 },
      { particle: '.particle-6', path: '#connection-path-6', duration: 3.7 },
      { particle: '.particle-7', path: '#connection-path-7', duration: 3.4 },
      { particle: '.particle-8', path: '#connection-path-8', duration: 3.5 }
    ];

    particlesPaths.forEach((item, index) => {
      const particleEl = document.querySelector(item.particle);
      const pathEl = document.querySelector(item.path);

      if (!particleEl || !pathEl) {
        console.warn(`⚠️ Particle ${item.particle} or path ${item.path} not found`);
        return;
      }

      // Animation avec MotionPath si disponible
      if (typeof MotionPathPlugin !== 'undefined') {
        gsap.to(particleEl, {
          duration: item.duration,
          repeat: -1,
          ease: 'none',
          motionPath: {
            path: pathEl,
            align: pathEl,
            alignOrigin: [0.5, 0.5],
            autoRotate: false
          },
          // Décalage temporel pour effet de flux continu
          delay: index * 0.3
        });
      } else {
        // Fallback : animation simple opacity pulse
        gsap.to(particleEl, {
          duration: 2,
          opacity: 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.2
        });
      }

      // Scintillement additionnel AMPLIFIÉ
      gsap.to(particleEl, {
        duration: 1.2 + (index * 0.15),
        scale: 1.6,
        opacity: 0.7,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: index * 0.12
      });
    });

    console.log('✨ Particules animées: 8 particules en mouvement');
  }

  // ============================================
  // PULSATION DU PROCESSEUR
  // ============================================
  function animateProcessorPulse() {
    const processorCore = document.querySelector('.processor-core');

    if (processorCore) {
      gsap.to(processorCore, {
        duration: config.processorPulseDuration,
        scale: 1.08,
        transformOrigin: '400px 310px',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }

    // Anneaux pulsants
    gsap.to('.processor-ring-outer', {
      duration: 4,
      scale: 1.05,
      opacity: 0.5,
      transformOrigin: '400px 310px',
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gsap.to('.processor-ring-mid', {
      duration: 3,
      scale: 1.03,
      opacity: 0.7,
      transformOrigin: '400px 310px',
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 0.5
    });

    // Point central brillant
    gsap.to('.core-center', {
      duration: 2,
      scale: 1.5,
      opacity: 0.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  // ============================================
  // GLOW INTERMITTENT DES NŒUDS
  // ============================================
  function animateNodeGlow() {
    // Input nodes
    document.querySelectorAll('.input-node').forEach((node, index) => {
      const glow = node.querySelector('.node-glow');
      if (glow) {
        gsap.to(glow, {
          duration: 2 + (index * 0.3),
          opacity: 0.6,
          scale: 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.5,
          transformOrigin: 'center'
        });
      }
    });

    // Output nodes
    document.querySelectorAll('.output-node').forEach((node, index) => {
      const glow = node.querySelector('.node-glow-rect');
      if (glow) {
        gsap.to(glow, {
          duration: 2.5 + (index * 0.3),
          opacity: 0.5,
          scale: 1.15,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.6,
          transformOrigin: 'center'
        });
      }
    });
  }

  // ============================================
  // ROTATION SUBTILE DU PROCESSEUR
  // ============================================
  function animateProcessorRotation() {
    const processor = document.querySelector('#central-processor');

    if (processor) {
      // Rotation très lente (60 secondes pour un tour complet)
      gsap.to(processor, {
        duration: 60,
        rotation: 360,
        repeat: -1,
        ease: 'none',
        transformOrigin: '400px 310px'
      });
    }
  }

  // ============================================
  // MICRO-INTERACTIONS
  // ============================================
  function setupMicroInteractions() {
    const animationContainer = document.querySelector('#hero-automation-animation');

    if (!animationContainer) return;

    // Hover sur l'animation : accélération des particules
    let isHovering = false;

    animationContainer.addEventListener('mouseenter', () => {
      if (isHovering) return;
      isHovering = true;

      // Accélération en réduisant la durée au lieu de timeScale
      gsap.globalTimeline.timeScale(1.8);

      console.log('⚡ Animation accélérée (hover)');
    });

    animationContainer.addEventListener('mouseleave', () => {
      isHovering = false;

      // Retour vitesse normale
      gsap.globalTimeline.timeScale(1);
    });

    // Click sur nœuds : pulse d'activation
    document.querySelectorAll('.input-node, .output-node').forEach(node => {
      node.style.cursor = 'pointer';

      node.addEventListener('click', function() {
        const glow = this.querySelector('.node-glow, .node-glow-rect');

        if (glow) {
          gsap.fromTo(glow, {
            opacity: 0,
            scale: 0.5
          }, {
            opacity: 0.9,
            scale: 1.5,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => {
              // Retour à l'animation normale
              gsap.to(glow, {
                opacity: 0.3,
                scale: 1,
                duration: 0.4
              });
            }
          });
        }

        console.log('🎯 Node clicked:', this.getAttribute('data-type'));
      });
    });
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  // Pause/Resume animation
  window.pauseHeroAnimation = function() {
    gsap.globalTimeline.pause();
    console.log('⏸️ Animation pausée');
  };

  window.resumeHeroAnimation = function() {
    gsap.globalTimeline.resume();
    console.log('▶️ Animation reprise');
  };

  // Reset animation
  window.resetHeroAnimation = function() {
    gsap.globalTimeline.seek(0);
    console.log('🔄 Animation reset');
  };

  // ============================================
  // DÉTECTION DE VISIBILITÉ (Performance)
  // ============================================
  function setupVisibilityDetection() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            resumeHeroAnimation();
          } else {
            pauseHeroAnimation();
          }
        });
      }, {
        threshold: 0.2
      });

      const animationEl = document.querySelector('#hero-automation-animation');
      if (animationEl) {
        observer.observe(animationEl);
      }
    }
  }

  // ============================================
  // DÉMARRAGE
  // ============================================
  function start() {
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  function init() {
    const svgElement = document.querySelector('#hero-automation-animation');

    if (!svgElement) {
      console.warn('⚠️ SVG Hero Animation not found in DOM');
      return;
    }

    // Lancer l'animation
    initHeroAnimation();

    // Setup interactions
    setupMicroInteractions();

    // Setup détection visibilité
    setupVisibilityDetection();

    console.log('🚀 Hero Animation initialisée avec succès');
  }

  // Démarrer
  start();

})();
