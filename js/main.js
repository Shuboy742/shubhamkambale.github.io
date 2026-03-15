 AOS.init({
 	duration: 700,
 	easing: 'ease-out',
 	offset: 80,
 	once: true
 });

(function($) {

	"use strict";

	// —— Hero sphere: first two scrolls = size only (small → medium), then fireworks burst
	var sphereCanvas = document.getElementById('sphere-canvas');
	var particlesContainer = document.getElementById('particles-container');
	if (sphereCanvas && particlesContainer) {
		var ctx = sphereCanvas.getContext('2d');
		var points = [];
		var rotationY = 0;
		var rotationX = 0.2;
		var CENTER_X = 0.5;
		var CENTER_Y = 0.5;
		var PERSPECTIVE = 400;
		var RADIUS_BASE = 0.18;
		var N = 750;
		var SCROLL_SMALL = 0;
		var SCROLL_MEDIUM = 220;
		var SCROLL_FIREWORK = 480;
		var FIREWORK_RANGE = 380;
		var i, phi, y, r, theta, x, z;
		for (i = 0; i < N; i++) {
			phi = Math.PI * (3 - Math.sqrt(5)) * i;
			y = 1 - (i / (N - 1)) * 2;
			r = Math.sqrt(1 - y * y);
			theta = phi;
			x = Math.cos(theta) * r;
			z = Math.sin(theta) * r;
			points.push({ x: x, y: y, z: z });
		}
		function resizeSphere() {
			var w = particlesContainer.offsetWidth;
			var h = particlesContainer.offsetHeight;
			var dpr = window.devicePixelRatio || 1;
			sphereCanvas.width = w * dpr;
			sphereCanvas.height = h * dpr;
			sphereCanvas.style.width = w + 'px';
			sphereCanvas.style.height = h + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		function colorForT(t) {
			var r1 = 0, g1 = 212, b1 = 255;
			var r2 = 32, g2 = 201, b2 = 151;
			var r3 = 0, g3 = 255, b3 = 136;
			if (t < 0.5) {
				t = t * 2;
				return 'rgba(' + Math.round(r1 + (r2 - r1) * t) + ',' + Math.round(g1 + (g2 - g1) * t) + ',' + Math.round(b1 + (b2 - b1) * t) + ',';
			} else {
				t = (t - 0.5) * 2;
				return 'rgba(' + Math.round(r2 + (r3 - r2) * t) + ',' + Math.round(g2 + (g3 - g2) * t) + ',' + Math.round(b2 + (b3 - b2) * t) + ',';
			}
		}
		function drawSphere() {
			var w = particlesContainer.offsetWidth;
			var h = particlesContainer.offsetHeight;
			if (!w || !h) { requestAnimationFrame(drawSphere); return; }
			var scrollY = window.pageYOffset || document.documentElement.scrollTop;
			var sphereScale = 1;
			if (scrollY <= SCROLL_SMALL) sphereScale = 1;
			else if (scrollY < SCROLL_MEDIUM) sphereScale = 1 + (scrollY - SCROLL_SMALL) / (SCROLL_MEDIUM - SCROLL_SMALL) * 0.45;
			else sphereScale = 1.45;
			var explosionAmount = 0;
			if (scrollY > SCROLL_FIREWORK) explosionAmount = Math.min(1, (scrollY - SCROLL_FIREWORK) / FIREWORK_RANGE);
			ctx.clearRect(0, 0, w, h);
			var cx = w * CENTER_X;
			var cy = h * CENTER_Y;
			var cosY = Math.cos(rotationY);
			var sinY = Math.sin(rotationY);
			var cosX = Math.cos(rotationX);
			var sinX = Math.sin(rotationX);
			var radiusNow = RADIUS_BASE * sphereScale;
			var projected = [];
			for (i = 0; i < points.length; i++) {
				var p = points[i];
				var x1 = p.x * cosY - p.z * sinY;
				var z1 = p.x * sinY + p.z * cosY;
				var y1 = p.y;
				var y2 = y1 * cosX - z1 * sinX;
				var z2 = y1 * sinX + z1 * cosX;
				var scale = PERSPECTIVE / (PERSPECTIVE + z2);
				var sx = cx + x1 * w * radiusNow * scale;
				var sy = cy + y2 * w * radiusNow * scale;
				if (explosionAmount > 0) {
					var dx = sx - cx;
					var dy = sy - cy;
					var dist = Math.sqrt(dx * dx + dy * dy) || 1;
					var burst = explosionAmount * Math.min(w, h) * 0.35;
					sx = sx + (dx / dist) * burst;
					sy = sy + (dy / dist) * burst;
				}
				var depth = (z2 + 1) / 2;
				var t = (p.y + 1) / 2;
				projected.push({ sx: sx, sy: sy, depth: depth, t: t });
			}
			projected.sort(function(a, b) { return a.depth - b.depth; });
			for (i = 0; i < projected.length; i++) {
				var d = projected[i];
				var alpha = 0.22 + 0.5 * d.depth;
				var size = 0.9 + 1.8 * d.depth;
				var base = colorForT(d.t) + alpha + ')';
				ctx.beginPath();
				ctx.arc(d.sx, d.sy, size, 0, Math.PI * 2);
				ctx.fillStyle = base;
				ctx.fill();
				ctx.beginPath();
				ctx.arc(d.sx, d.sy, size * 1.6, 0, Math.PI * 2);
				var g = ctx.createRadialGradient(d.sx, d.sy, 0, d.sx, d.sy, size * 1.6);
				g.addColorStop(0, base);
				g.addColorStop(0.5, colorForT(d.t) + (alpha * 0.25) + ')');
				g.addColorStop(1, 'rgba(0,212,255,0)');
				ctx.fillStyle = g;
				ctx.fill();
			}
			rotationY += 0.002;
			requestAnimationFrame(drawSphere);
		}
		resizeSphere();
		window.addEventListener('resize', resizeSphere);
		drawSphere();
		// Container: only first two scrolls change scale (small → medium); then fixed; + mouse parallax
		var mouseX = 0.5, mouseY = 0.5;
		var PARALLAX = 0.02;
		function updateSphereTransform() {
			var scrollY = window.pageYOffset || document.documentElement.scrollTop;
			var scale = 1;
			if (scrollY <= SCROLL_SMALL) scale = 1;
			else if (scrollY < SCROLL_MEDIUM) scale = 1 + (scrollY - SCROLL_SMALL) / (SCROLL_MEDIUM - SCROLL_SMALL) * 0.45;
			else scale = 1.45;
			var tx = (mouseX - 0.5) * 80 * PARALLAX;
			var ty = (mouseY - 0.5) * 80 * PARALLAX;
			particlesContainer.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
		}
		document.addEventListener('mousemove', function(e) {
			mouseX = e.clientX / window.innerWidth;
			mouseY = e.clientY / window.innerHeight;
			updateSphereTransform();
		});
		window.addEventListener('scroll', updateSphereTransform);
		updateSphereTransform();
	}

	// —— Typed.js (hero subtitle)
	if (typeof Typed === 'function' && document.getElementById('typed-subtitle')) {
		new Typed('#typed-subtitle', {
			strings: ['AI Engineer', 'RAG Architect', 'Computer Vision Developer', 'ML Architect', 'Agentic Workflow Designer'],
			typeSpeed: 60,
			backSpeed: 40,
			backDelay: 2000,
			loop: true,
			showCursor: true
		});
	}

	// —— Custom cursor glow
	var cursor = document.createElement('div');
	cursor.id = 'cursor-glow';
	cursor.style.cssText = 'position:fixed;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle,rgba(0,212,255,0.6),transparent);pointer-events:none;z-index:9999;transition:transform 0.1s ease;';
	document.body.appendChild(cursor);
	document.addEventListener('mousemove', function(e) {
		cursor.style.left = (e.clientX - 10) + 'px';
		cursor.style.top = (e.clientY - 10) + 'px';
	});

	// —— Float skill tags (for open-palm gesture; exposed for gesture.js)
	window.floatSkillTags = function() {
		var skills = ['RAG', 'YOLOv8', 'LangChain', 'OpenCV', 'ElevenLabs', 'PaddleOCR', 'n8n', 'Embeddings'];
		skills.forEach(function(s, i) {
			var el = document.createElement('span');
			el.textContent = s;
			el.style.cssText = 'position:fixed;top:' + (Math.random() * 80 + 10) + '%;left:' + (Math.random() * 80 + 10) + '%;background:rgba(0,212,255,0.15);border:1px solid var(--accent-blue);color:var(--accent-blue);padding:6px 14px;border-radius:20px;font-size:0.85rem;z-index:1000;pointer-events:none;animation:floatUp 2s ease forwards;animation-delay:' + (i * 0.15) + 's';
			document.body.appendChild(el);
			setTimeout(function() { el.remove(); }, 2500);
		});
	};

	$(window).stellar({
    responsive: true,
    parallaxBackgrounds: true,
    parallaxElements: true,
    horizontalScrolling: false,
    hideDistantElements: false,
    scrollProperty: 'scroll'
  });


	var fullHeight = function() {

		$('.js-fullheight').css('height', $(window).height());
		$(window).resize(function(){
			$('.js-fullheight').css('height', $(window).height());
		});

	};
	fullHeight();

	// loader
	var loader = function() {
		setTimeout(function() { 
			if($('#ftco-loader').length > 0) {
				$('#ftco-loader').removeClass('show');
			}
		}, 1);
	};
	loader();

	// Scrollax
   $.Scrollax();



   // Burger Menu
	var burgerMenu = function() {

		$('body').on('click', '.js-fh5co-nav-toggle', function(event){

			event.preventDefault();

			if ( $('#ftco-nav').is(':visible') ) {
				$(this).removeClass('active');
			} else {
				$(this).addClass('active');	
			}

			
			
		});

	};
	burgerMenu();


	var onePageClick = function() {


		$(document).on('click', '#ftco-nav a[href^="#"]', function (event) {
	    event.preventDefault();
	    var $target = $($.attr(this, 'href'));
	    if (!$target.length) return;
	    $('html, body').animate({
	        scrollTop: $target.offset().top - 70
	    }, 900, 'easeOutExpo');
		});

	};

	onePageClick();
	

	var carousel = function() {
		if (!$('.home-slider').length) return;
		$('.home-slider').owlCarousel({
	    loop:true,
	    autoplay: true,
	    margin:0,
	    animateOut: 'fadeOut',
	    animateIn: 'fadeIn',
	    nav:false,
	    autoplayHoverPause: false,
	    items: 1,
	    navText : ["<span class='ion-md-arrow-back'></span>","<span class='ion-chevron-right'></span>"],
	    responsive:{
	      0:{
	        items:1
	      },
	      600:{
	        items:1
	      },
	      1000:{
	        items:1
	      }
	    }
		});
	};
	carousel();

	$('nav .dropdown').hover(function(){
		var $this = $(this);
		// 	 timer;
		// clearTimeout(timer);
		$this.addClass('show');
		$this.find('> a').attr('aria-expanded', true);
		// $this.find('.dropdown-menu').addClass('animated-fast fadeInUp show');
		$this.find('.dropdown-menu').addClass('show');
	}, function(){
		var $this = $(this);
			// timer;
		// timer = setTimeout(function(){
			$this.removeClass('show');
			$this.find('> a').attr('aria-expanded', false);
			// $this.find('.dropdown-menu').removeClass('animated-fast fadeInUp show');
			$this.find('.dropdown-menu').removeClass('show');
		// }, 100);
	});


	$('#dropdown04').on('show.bs.dropdown', function () {
	  console.log('show');
	});

	// scroll
	var scrollWindow = function() {
		$(window).scroll(function(){
			var $w = $(this),
					st = $w.scrollTop(),
					navbar = $('.ftco_navbar'),
					sd = $('.js-scroll-wrap');

			if (st > 80) {
				if ( !navbar.hasClass('scrolled') ) {
					navbar.addClass('scrolled');	
				}
			} 
			if (st < 80) {
				if ( navbar.hasClass('scrolled') ) {
					navbar.removeClass('scrolled sleep');
				}
			} 
			if ( st > 350 ) {
				if ( !navbar.hasClass('awake') ) {
					navbar.addClass('awake');	
				}
				
				if(sd.length > 0) {
					sd.addClass('sleep');
				}
			}
			if ( st < 350 ) {
				if ( navbar.hasClass('awake') ) {
					navbar.removeClass('awake');
					navbar.addClass('sleep');
				}
				if(sd.length > 0) {
					sd.removeClass('sleep');
				}
			}
		});
	};
	scrollWindow();

	

	var counter = function() {
		
		$('#section-counter, .hero-wrap, .ftco-counter, .ftco-about, #about-section').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {

				var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(',');
				$('.number, .animate-number').each(function(){
					var $this = $(this),
						num = $this.data('number');
					if (num !== undefined) {
						$this.animateNumber(
						  {
						    number: num,
						    numberStep: comma_separator_number_step
						  }, 1500
						);
					}
				});
				$(this.element).addClass('ftco-animated');
			}

		} , { offset: '95%' } );

	}
	counter();


	var contentWayPoint = function() {
		var i = 0;
		$('.ftco-animate').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {
				
				i++;

				$(this.element).addClass('item-animate');
				setTimeout(function(){

					$('body .ftco-animate.item-animate').each(function(k){
						var el = $(this);
						setTimeout( function () {
							var effect = el.data('animate-effect');
							if ( effect === 'fadeIn') {
								el.addClass('fadeIn ftco-animated');
							} else if ( effect === 'fadeInLeft') {
								el.addClass('fadeInLeft ftco-animated');
							} else if ( effect === 'fadeInRight') {
								el.addClass('fadeInRight ftco-animated');
							} else {
								el.addClass('fadeInUp ftco-animated');
							}
							el.removeClass('item-animate');
						},  k * 50, 'easeInOutExpo' );
					});
					
				}, 100);
				
			}

		} , { offset: '95%' } );
	};
	contentWayPoint();

	// magnific popup
	$('.image-popup').magnificPopup({
    type: 'image',
    closeOnContentClick: true,
    closeBtnInside: false,
    fixedContentPos: true,
    mainClass: 'mfp-no-margins mfp-with-zoom', // class to remove default margin from left and right side
     gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0,1] // Will preload 0 - before current, and 1 after the current image
    },
    image: {
      verticalFit: true
    },
    zoom: {
      enabled: true,
      duration: 300 // don't foget to change the duration also in CSS
    }
  });

  $('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
    disableOn: 700,
    type: 'iframe',
    mainClass: 'mfp-fade',
    removalDelay: 160,
    preloader: false,

    fixedContentPos: false
  });

  // Close mobile navbar when a nav link is clicked (user-friendly on small screens)
  $('#ftco-nav .nav-link').on('click', function() {
    var collapse = $('#ftco-nav');
    if (collapse.hasClass('show')) {
      collapse.collapse('hide');
    }
  });

})(jQuery);

