// ===== LANDING PAGE JAVASCRIPT =====
// P.I.E.P. - Plataforma Inteligente de Estudio Personalizado


const btnZofox = document.querySelector('.btn-zofox');
const zofoxContainer = document.querySelector('.btn-zofox-container');

btnZofox.addEventListener('mouseenter', () => {
    zofoxContainer.classList.add('visible');
});

btnZofox.addEventListener('mouseleave', () => {
    zofoxContainer.classList.remove('visible');
});

class Carousel3D {
  constructor() {
    this.carousel = document.getElementById("carousel3d")
    this.items = document.querySelectorAll(".carousel-item")
    this.indicators = document.querySelectorAll(".indicator")
    this.currentIndex = 0
    this.totalItems = this.items.length
    this.autoPlayInterval = null
    this.autoPlayDelay = 3000 // 3 segundos

    this.init()
  }

  init() {
    // Configurar posiciones iniciales
    this.updateCarousel()

    // Configurar indicadores
    this.setupIndicators()

    // Iniciar auto-play
    this.startAutoPlay()

    
  }

  updateCarousel() {
    this.items.forEach((item, index) => {
      // Remover clase active
      item.classList.remove("active")

      const mainIndex = this.currentIndex
      const leftIndex = (this.currentIndex - 1 + this.totalItems) % this.totalItems
      const rightIndex = (this.currentIndex + 1) % this.totalItems
      const backIndex = (this.currentIndex + 2) % this.totalItems

      if (index === mainIndex) {
        // Tarjeta principal - al frente y centrada
        item.classList.add("active")
        item.style.opacity = "1"
        item.style.filter = "blur(0px)"
        item.style.transform = `translate(-50%, -50%) translateX(0px) scale(1.1)`
        item.style.zIndex = "10"
      } else if (index === leftIndex) {
        // Tarjeta izquierda
        item.style.opacity = "0.7"
        item.style.filter = "blur(1px)"
        item.style.transform = `translate(-50%, -50%) translateX(-150px) scale(0.9)`
        item.style.zIndex = "5"
      } else if (index === rightIndex) {
        // Tarjeta derecha
        item.style.opacity = "0.7"
        item.style.filter = "blur(1px)"
        item.style.transform = `translate(-50%, -50%) translateX(150px) scale(0.9)`
        item.style.zIndex = "5"
      } else if (index === backIndex) {
        // Tarjeta trasera - atrás de la principal
        item.style.opacity = "0.4"
        item.style.filter = "blur(2px)"
        item.style.transform = `translate(-50%, -50%) translateX(0px) translateZ(-100px) scale(0.8)`
        item.style.zIndex = "1"
      } else {
        // Ocultar otras tarjetas
        item.style.opacity = "0"
        item.style.filter = "blur(3px)"
        item.style.transform = `translate(-50%, -50%) translateX(0px) scale(0.5)`
        item.style.zIndex = "0"
      }
    })

    // Actualizar indicadores
    this.updateIndicators()
  }

  setupIndicators() {
    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", () => {
        this.goToSlide(index)
      })
    })
  }

  updateIndicators() {
    this.indicators.forEach((indicator, index) => {
      indicator.classList.toggle("active", index === this.currentIndex)
    })
  }

  goToSlide(index) {
    if (index !== this.currentIndex) {
      this.currentIndex = index
      this.updateCarousel()
      this.restartAutoPlay()
    }
  }

  nextSlide() {
    this.currentIndex = (this.currentIndex + 1) % this.totalItems
    this.updateCarousel()
  }

  prevSlide() {
    this.currentIndex = (this.currentIndex - 1 + this.totalItems) % this.totalItems
    this.updateCarousel()
  }

  startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide()
    }, this.autoPlayDelay)
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval)
      this.autoPlayInterval = null
    }
  }

  restartAutoPlay() {
    this.stopAutoPlay()
    this.startAutoPlay()
  }

  
}
document.addEventListener('DOMContentLoaded', function() {
    new Carousel3D()
    
    // ===== VARIABLES GLOBALES =====
    const navbar = document.querySelector('.navbar');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    
    // ===== NAVEGACIÓN MÓVIL =====
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
            
            // Animación del hamburger
            const spans = navToggle.querySelectorAll('span');
            spans.forEach((span, index) => {
                if (navToggle.classList.contains('active')) {
                    if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                    if (index === 1) span.style.opacity = '0';
                    if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    span.style.transform = 'none';
                    span.style.opacity = '1';
                }
            });
        });
    }
    
    // Cerrar menú móvil al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
    
    // ===== NAVEGACIÓN SUAVE =====
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 70; // Ajuste para navbar fijo
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ===== NAVEGACIÓN ACTIVA EN SCROLL =====
    function updateActiveNavLink() {
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    // ===== CAMBIO DE ESTILO DE NAVBAR EN SCROLL =====
    function updateNavbarStyle() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    
    // ===== ANIMACIONES AL HACER SCROLL =====
    function animateOnScroll() {
        const elements = document.querySelectorAll('[data-aos]');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('aos-animate');
            }
        });
    }
    
    /* // ===== CONTADORES ANIMADOS =====
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        counters.forEach(counter => {
            const target = parseInt(counter.textContent.replace(/\D/g, ''));
            const increment = target / 100;
            let current = 0;
            
            const updateCounter = () => {
                if (current < target) {
                    current += increment;
                    counter.textContent = Math.ceil(current).toLocaleString() + 
                        (counter.textContent.includes('%') ? '%' : 
                         counter.textContent.includes('+') ? '+' : '');
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = counter.textContent.replace(/\d+/, target.toLocaleString());
                }
            };
            
            updateCounter();
        });
    } */
    
    // ===== FORMULARIO DE REGISTRO =====
    const registerForm = document.querySelector('.register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const name = this.querySelector('input[type="text"]').value;
            const email = this.querySelector('input[type="email"]').value;
            const role = this.querySelector('select').value;
            
            // Validación básica
            if (!name || !email || !role) {
                showNotification('Por favor completa todos los campos', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Por favor ingresa un email válido', 'error');
                return;
            }
            
            // Simular envío
            showNotification('¡Registro exitoso! Te hemos enviado un email de confirmación.', 'success');
            this.reset();
            
            // Redirigir a login después de 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        });
    }
    
    // ===== VALIDACIÓN DE EMAIL =====
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // ===== SISTEMA DE NOTIFICACIONES =====
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        const bgColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-text">${message}</div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-family: 'Poppins', Arial, sans-serif;
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Animar salida
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
    
    // ===== ANIMACIÓN DE TARJETAS FLOTANTES =====
    function animateFloatingCards() {
        const cards = document.querySelectorAll('.floating-card');
        
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.5}s`;
        });
    }
    
    // ===== EFECTO PARALLAX SUAVE =====
    function parallaxEffect() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.hero-image, .floating-card');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    }
    
    // ===== ANIMACIÓN DE PROGRESO EN PRECIOS =====
    function animatePricingCards() {
        const pricingCards = document.querySelectorAll('.pricing-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        
        pricingCards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            observer.observe(card);
        });
    }
    
    // ===== ANIMACIÓN DE TESTIMONIOS =====
    function animateTestimonials() {
        const testimonialCards = document.querySelectorAll('.testimonial-card');
        
        testimonialCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.2}s`;
        });
    }
    
    // ===== BOTÓN "VOLVER ARRIBA" =====
    function createBackToTopButton() {
        const backToTop = document.createElement('button');
        backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
        backToTop.className = 'back-to-top';
        backToTop.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        
        document.body.appendChild(backToTop);
        
        // Mostrar/ocultar botón
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.style.opacity = '1';
                backToTop.style.visibility = 'visible';
            } else {
                backToTop.style.opacity = '0';
                backToTop.style.visibility = 'hidden';
            }
        });
        
        // Scroll hacia arriba
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Hover effect
        backToTop.addEventListener('mouseenter', () => {
            backToTop.style.transform = 'translateY(-3px)';
        });
        
        backToTop.addEventListener('mouseleave', () => {
            backToTop.style.transform = 'translateY(0)';
        });
    }
    
    // ===== LAZY LOADING DE IMÁGENES =====
    function lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
    
    // ===== ANIMACIÓN DE ESTADÍSTICAS =====
    function animateStats() {
        const statsSection = document.querySelector('.hero-stats');
        if (!statsSection) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(statsSection);
    }
    
    // ===== PRELOADER (opcional) =====
    function hidePreloader() {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 300);
        }
    }
    
    // ===== EVENT LISTENERS =====
	window.addEventListener('scroll', () => {
		updateActiveNavLink();
		updateNavbarStyle();
		animateOnScroll();
	});
    
    window.addEventListener('resize', () => {
        // Reajustar elementos en resize
        if (window.innerWidth > 768) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });
    
    // ===== INICIALIZACIÓN =====
    function init() {
        // Ejecutar funciones de inicialización
        animateFloatingCards();
        animatePricingCards();
        animateTestimonials();
        createBackToTopButton();
        lazyLoadImages();
        animateStats();
        hidePreloader();
        
        // Ejecutar animaciones iniciales
        setTimeout(() => {
            animateOnScroll();
        }, 100);
    }
    
    // ===== EJECUTAR INICIALIZACIÓN =====
    init();
    
    // ===== ESTILOS ADICIONALES PARA NAVBAR SCROLLED =====
    const style = document.createElement('style');
    style.textContent = `
        .navbar.scrolled {
            background: rgba(255, 255, 255, 0.98) !important;
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
        }
        
        .nav-menu.active {
            display: flex !important;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border-top: 1px solid var(--border-color);
        }
        
        .nav-menu.active .nav-link {
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
        }
        
        .nav-menu.active .nav-link:last-child {
            border-bottom: none;
        }
        
        .nav-link.active {
            color: var(--primary-color) !important;
        }
        
        .nav-link.active::after {
            width: 100% !important;
        }
        
        @media (max-width: 768px) {
            .nav-menu {
                display: none;
            }
        }
    `;
    document.head.appendChild(style);
    
    // ===== CONSOLE LOG PARA DESARROLLO =====
    console.log('🚀 P.I.E.P. Landing Page cargada correctamente');
    console.log('📚 Plataforma Inteligente de Estudio Personalizado');
    console.log('✨ Animaciones y funcionalidades activas');
    
});

// ===== FUNCIONES UTILITARIAS =====

// Función para debounce (optimizar performance)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Función para throttle (limitar frecuencia de ejecución)
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== EXPORTAR FUNCIONES PARA USO EXTERNO =====
window.PIEPLanding = {
    showNotification: function(message, type) {
        // Función global para mostrar notificaciones
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        }
    },
    
    scrollToSection: function(sectionId) {
        const section = document.querySelector(sectionId);
        if (section) {
            const offsetTop = section.offsetTop - 70;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }
};
