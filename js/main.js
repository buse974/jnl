/**
 * JNL Service - Main JavaScript
 * Handles all interactive functionality
 */

(function() {
    'use strict';

    // ============================================
    // HEADER SCROLL EFFECT
    // ============================================
    const header = document.querySelector('.header');

    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // ============================================
    // MOBILE NAVIGATION
    // ============================================
    const navToggle = document.getElementById('navToggle');
    const nav = document.getElementById('nav');
    const navOverlay = document.getElementById('navOverlay');
    const navLinks = document.querySelectorAll('.nav-link');

    function closeMobileNav() {
        if (!navToggle || !nav) return;
        navToggle.classList.remove('active');
        nav.classList.remove('active');
        if (navOverlay) navOverlay.classList.remove('active');
    }

    if (navToggle && nav) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            nav.classList.toggle('active');
            if (navOverlay) navOverlay.classList.toggle('active');
        });

        if (navOverlay) {
            navOverlay.addEventListener('click', closeMobileNav);
        }

        navLinks.forEach(link => {
            link.addEventListener('click', closeMobileNav);
        });
    }

    // ============================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href.length < 2) return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================================
    // COUNTER ANIMATION
    // ============================================
    const counters = document.querySelectorAll('.stat-number');
    let countersAnimated = false;

    function animateCounters() {
        if (countersAnimated || counters.length === 0) return;

        counters.forEach(counter => {
            const rect = counter.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                countersAnimated = true;

                const target = parseInt(counter.getAttribute('data-count'));
                const suffix = counter.getAttribute('data-suffix') || '+';
                if (isNaN(target)) return;
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;

                const updateCounter = () => {
                    current += step;
                    if (current < target) {
                        counter.textContent = Math.floor(current) + suffix;
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target + suffix;
                    }
                };

                updateCounter();
            }
        });
    }

    if (counters.length > 0) {
        window.addEventListener('scroll', animateCounters, { passive: true });
        animateCounters();
    }

    // ============================================
    // CONTACT FORM HANDLING
    // ============================================
    document.querySelectorAll('form.contact-form').forEach(contactForm => {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            if (!data.nom || !data.prenom || !data.email || !data.telephone) {
                showNotification('Veuillez remplir tous les champs obligatoires.', 'error');
                return;
            }

            const phoneDigits = data.telephone.replace(/\s/g, '');
            const phoneRegex = /^0[1-9]\d{8}$/;
            if (!phoneRegex.test(phoneDigits)) {
                showNotification('Veuillez entrer un numéro de téléphone valide.', 'error');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                showNotification('Veuillez entrer une adresse email valide.', 'error');
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Envoi en cours...</span>';
            submitBtn.disabled = true;

            try {
                const resp = await fetch('/api/contact.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await resp.json();
                if (result.success) {
                    showNotification('Merci ! Votre message a été envoyé. Nous vous recontacterons sous 48h.', 'success');
                    this.reset();
                } else {
                    showNotification(result.message || 'Une erreur est survenue.', 'error');
                }
            } catch {
                showNotification('Impossible d\'envoyer le message. Réessayez plus tard.', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    });

    // ============================================
    // NOTIFICATION SYSTEM
    // ============================================
    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ?
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' :
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                    }
                </span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="Fermer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification { position: fixed; top: 100px; right: 20px; z-index: 10000; animation: slideIn 0.3s ease; }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .notification-content { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); max-width: 400px; }
                .notification-success .notification-icon { color: #16a34a; }
                .notification-error .notification-icon { color: #dc2626; }
                .notification-icon svg { width: 24px; height: 24px; }
                .notification-message { flex: 1; font-size: 14px; line-height: 1.5; }
                .notification-close { padding: 4px; border: none; background: none; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; }
                .notification-close:hover { opacity: 1; }
                .notification-close svg { width: 18px; height: 18px; }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // ============================================
    // PHONE NUMBER FORMATTING
    // ============================================
    document.querySelectorAll('input[type="tel"]').forEach(phoneInput => {
        phoneInput.addEventListener('input', function() {
            const cursorPos = this.selectionStart;
            const prevLength = this.value.length;

            let digits = this.value.replace(/\D/g, '');
            if (digits.length > 10) digits = digits.substring(0, 10);

            let formatted = '';
            for (let i = 0; i < digits.length; i++) {
                if (i > 0 && i % 2 === 0) formatted += ' ';
                formatted += digits[i];
            }

            this.value = formatted;

            const diff = this.value.length - prevLength;
            this.setSelectionRange(cursorPos + diff, cursorPos + diff);
        });

        phoneInput.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey || e.key.length > 1) return;
            if (!/\d/.test(e.key)) e.preventDefault();
        });
    });

    // ============================================
    // LIGHTBOX GALLERY
    // ============================================
    const lightbox = document.getElementById('lightbox');
    const galleryImages = window.__galleryImages || [];
    let currentImageIndex = 0;

    window.openLightbox = function(index) {
        if (!lightbox) return;
        currentImageIndex = index;
        const lightboxImg = document.getElementById('lightbox-img');
        if (lightboxImg) lightboxImg.src = galleryImages[index];
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeLightbox = function() {
        if (!lightbox) return;
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    };

    window.navigateLightbox = function(direction) {
        if (!lightbox || galleryImages.length === 0) return;
        currentImageIndex += direction;
        if (currentImageIndex < 0) currentImageIndex = galleryImages.length - 1;
        if (currentImageIndex >= galleryImages.length) currentImageIndex = 0;
        const lightboxImg = document.getElementById('lightbox-img');
        if (lightboxImg) lightboxImg.src = galleryImages[currentImageIndex];
    };

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target.id === 'lightbox') window.closeLightbox();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (lightbox && lightbox.classList.contains('active')) window.closeLightbox();
            else if (nav && nav.classList.contains('active')) closeMobileNav();
        }
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'ArrowLeft') window.navigateLightbox(-1);
            if (e.key === 'ArrowRight') window.navigateLightbox(1);
        }
    });

    // ============================================
    // CUSTOM CURSOR (desktop only)
    // ============================================
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');

    if (cursor && follower && window.innerWidth > 1024) {
        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';

            followerX += (mouseX - followerX) * 0.1;
            followerY += (mouseY - followerY) * 0.1;
            follower.style.left = followerX + 'px';
            follower.style.top = followerY + 'px';

            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        const hoverElements = document.querySelectorAll(
            'a, button, .btn, .gallery-item, .nav-link, .service-block, .testimonial-card, .jardin-card, .benne-card, .value-item'
        );

        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('cursor-hover');
                follower.classList.add('cursor-follower-hover');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('cursor-hover');
                follower.classList.remove('cursor-follower-hover');
            });
        });

        document.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
            follower.style.opacity = '0';
        });
        document.addEventListener('mouseenter', () => {
            cursor.style.opacity = '1';
            follower.style.opacity = '0.5';
        });
    }

})();
