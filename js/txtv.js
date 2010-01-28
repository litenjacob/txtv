// What events to use?
touchstart = 'ontouchstart' in document.documentElement ? 'touchstart' : 'mousedown';
touchmove = 'ontouchmove' in document.documentElement ? 'touchmove' : 'mousemove';
touchend = 'ontouchend' in document.documentElement ? 'touchend' : 'mouseup';

iphone = navigator.userAgent.match(/iPhone/i);

// The singleton
var txtv = {
    height: 416, // Lazily hardcoded
    width: 320,
    dom: {
        body: $('body'),
        pages: $('#pages'),
        document: $(document),
        numpad: $('#numpad'),
    },
    init: function(){
        document.preventScroll = true; // Let me handle my own scrolling, please
        
        // Quick fix to remap the iPhone's touch events
        if(iphone){
            txtv.touch.normalize = function(func){
                return function(e){
                    
                    if (!e.normalized) {
                        var _e = e.originalEvent.changedTouches[0];
                        e.pageX = _e.pageX;
                        e.pageY = _e.pageY;
                        e._normalized = true;
                    }
                    return func(e);
                }
            }
        } else {
            txtv.touch.normalize = function(func){
                return function(e){
                    return func(e);
                }
            }
        }
        
        // 100 is the start page
        txtv.page.create(100);

        // Kill movements
        document.addEventListener('touchmove', function(e){
            e.preventDefault();
            return false;    
        }, false);
        
        // Bind numpad events
        txtv.dom.numpad.keyup(txtv.pagenum.change);
        txtv.dom.numpad.blur(txtv.pagenum.blur);
    },
    pagenum: {
        update: function(num){
            var num = num + ''; // Needs to be string
            var headline = txtv.touch.vars.elem.find('pre').contents().get(0);
            var numArr = num.split("");
            
            // Fetch the textnode and replace the page number in it with our input
            var cur = headline.textContent;
            var s = cur.replace(/([\d\-]{3})/, function(all,sub){
                var arr = sub.split("");
                for(var j = 0; j < arr.length; j++){
                    if(numArr[j] != undefined){
                        arr[j] = numArr[j];
                    } else {
                        arr[j] = '-';
                    }
                }
                return arr.join("");
            });
            headline.textContent = s;
        },
        change: function(e){
            var input = $(e.currentTarget);
            var num = input.val();
            txtv.pagenum.update(num);
            
            if(num.length == 3){
                input.blur();
            }
        },
        blur: function(e){
            var input = $(e.currentTarget).show();
            var num = input.val();
            
            // Reset the page number of the page we're on
            txtv.pagenum.update.call(txtv.touch.vars.elem.data('num'));
            
            // All page numbers consists of three digits, so move to page if we've got exactly three digits
            if(num.length == 3){
                txtv.page.create(num);
            }
            input.val('');
        }
    },

    touch: {
        normalize: null,
        vars: {
            h: 0
        },
        start: function(e){    
            var vars = txtv.touch.vars;
            vars.at = {x: e.pageX, y: e.pageY }; // Touchdown!
            vars.touching = true;
        },
        move: function(e){
            if (txtv.touch.vars.touching) {
                var vars = txtv.touch.vars;
                var at = vars.at;
                var dir = vars.dir;
                
                if (!dir) {
                    if (Math.abs(e.pageY - at.y) > 10) { // Are we scrolling vertically?
                        vars.dir = 'v';
                    } else {
                        if (Math.abs(e.pageX - at.x) > 10) { // Or are we scrolling horizontally?
                            vars.dir = 'h';
                        }
                    }
                } else {
                    if(dir == 'v'){ // Perform vertical scroll
                        var diffY = e.pageY - at.y;
                        vars.prev.css('webkitTransform', 'translate3d(0px, ' + (diffY - txtv.height) + 'px, 0px)');
                        vars.elem.css('webkitTransform', 'translate3d(0px, ' + (diffY) + 'px, 0px)');
                        vars.next.css('webkitTransform', 'translate3d(0px, ' + (diffY + txtv.height) + 'px, 0px)');
                    } else {
                        if(dir == 'h'){ // Perform horizontal subpage scroll
                            vars.elem.css('webkitTransform', 'translate3d(' + (-vars.h * txtv.width + e.pageX - at.x) + 'px, 0px, 0px)');
                        }
                    }
                    
                }
            }
            return false;
        },
        end: function(e){
            var vars = txtv.touch.vars;
            if (vars.touching) {
                vars.touching = false;
                if (vars.dir == 'v') {
                    var diffY = e.pageY - vars.at.y;
                    var prevPos, elemPos, nextPos;
                    
                    if (diffY > 50) { // Going up
                        prevPos = 0;
                        elemPos = txtv.height;
                        nextPos = txtv.height * 2;
                        vars.activeElem = vars.prev;
                    }
                    else 
                        if (diffY < -50) { // Going down
                            prevPos = -txtv.height * 2;
                            elemPos = -txtv.height;
                            nextPos = 0;
                            vars.activeElem = vars.next;
                        }
                        else { // Staying
                            prevPos = -txtv.height;
                            elemPos = 0;
                            nextPos = txtv.height;
                            vars.activeElem = vars.elem;
                        }
                    
                    vars.prev.addClass('anim');
                    vars.elem.addClass('anim');
                    vars.next.addClass('anim');
                    
                    vars.prev.css('webkitTransform', 'translate3d(0px, ' + (prevPos) + 'px, 0px)');
                    vars.elem.css('webkitTransform', 'translate3d(0px, ' + (elemPos) + 'px, 0px)');
                    vars.next.css('webkitTransform', 'translate3d(0px, ' + (nextPos) + 'px, 0px)');
                    
                    // Let the animation start before we prefetch nearby pages - otherwise it might stutter
                    setTimeout(function(){
                        txtv.page.getNearby(vars.activeElem);
                    }, 100);
                    
                    
                    vars.h = 0; // Reset horizontal scroll
                    
                } else if (vars.dir == 'h') {
                    var h = vars.h;
                    var children = txtv.touch.vars.elem.children().filter('div').length;
                    var diffX = e.pageX - vars.at.x;
    
                    if (diffX < 50 && h + 1 <= children - 1) { // Going right, if possible
                        h++;
                    }
                    else 
                        if (diffX > -50 && h - 1 >= 0) { // Going left, if possible
                            h--;
                        }
                    
                    vars.elem.addClass('anim');
                    vars.elem.css('webkitTransform', 'translate3d(' + (-h * txtv.width) + 'px, 0px, 0px)');
                    vars.h = h;
                }
                
                vars.dir = null; // Reset direction
            }
        },
        animEnd: function(e){
            $(e.currentTarget).removeClass('anim'); // Remove anim class to be able to drag page again
        },
        normalize: null
    },
	page: {
		request: function(num, callback, pos){
			// Create container
			var num = parseInt(num);
	        var con = $('<div/>')
	            .attr('id', 'page' + num)
	            .append($('<div class="loader"><span>' + num + '</span></div>'))
	            .data('loaded', false)
	            .css('webkitTransform', 'translate3d(0px, ' + (pos) + 'px, 0px)');
	            
	            // Putting all pages in order
	            var anchor;
	            $(txtv.dom.pages.children()).each(function(i){
	                if($(this).data('num') < num){
	                    anchor = $(this);
	                }
	            })
	
	            if(anchor){
	                anchor.after(con);
	            } else {
	                txtv.dom.pages.append(con);
	            }
	            
	            con.show()
	        
			// Make the request    
	        $.ajax({
	            url: 'http://79.99.1.153/txtv/api/' + num + '.html', // Gateway for cross domain requests
	            dataType: 'jsonp',
	            success: function(data){
	                con
	                    .bind(touchstart, txtv.touch.normalize(txtv.touch.start))
	                    .bind(touchmove, txtv.touch.normalize(txtv.touch.move))
	                    .bind(touchend, txtv.touch.normalize(txtv.touch.end))
	                    .bind('webkitTransitionEnd', txtv.touch.animEnd);
	                
	                // SVT:s counting is upside down
	                var previousPage = data.match(/nextPage = "(\d+).html"/)[1],
	                    nextPage = data.match(/previousPage = "(\d+).html"/)[1],
	                    rawString = data
	                        .substring(data.indexOf('<pre'), data.lastIndexOf('</pre>') + 6) // Extract all pages
	                        .replace(/background: url.*?\.gif\)/g, '') // Remove ugly background images
	                        .replace(/(\d{3}).html/g, function(all, sub){ 
	                            return 'javascript:txtv.page.create(' + sub + ');'; // Not pretty, but live click event on iPhone is slow...
	                        }),
	                    pages = $(rawString)
	                        .filter(function(i,elem){ // Filter pages
	                            return elem.nodeName == 'PRE';
	                        })
	                        .appendTo(con.empty())
	                        .wrap('<div class="page"/>')
	                        .each(function(i){
	                            $(this).parent().css('left', txtv.width*i); // Position subpages
	                        })
	
	                previousPage = (num == 100 && previousPage == 100 ? 897 : previousPage);
	                
	                con
	                    .data('loaded', true)
	                    .data('num', num)
	                    .data('prev', previousPage)
	                    .data('next', nextPage)
	                    .trigger('loaded')
	                
	                if (callback) {
	                    callback(con);
	                }
	            },
	            error: function(){
	                con.remove();
	            }
	        });
	        return con;
	    },
		create: function(num, caching, pos){
		    var num = num || 100,
		        pos = pos || 0;
		        
		    var page = $('#page' + num); // Try fetching page from DOM
		    if(!caching){
		        page.css('webkitTransform', 'translate3d(0px, ' + (pos) + 'px, 0px)');
		        if(txtv.touch.vars.elem){ // Get it out of the viewport if non-empty
		            txtv.touch.vars.elem.css('webkitTransform', 'translate3d(0px, ' + (txtv.height) + 'px, 0px)');
		        }
		    }
		    if (!page.length) { // Didn we not find the node? If not, fetch it!
		        return txtv.page.request(num, function(con){ 
		            if (!caching) {
		                txtv.page.getNearby(con); // Prefetching
		            }
		        }, pos);
		    } else {
		        if (!caching) {
		            txtv.page.getNearby(page); // Prefetching
		        }
		        return page;
		    }
		},
		fetchNearby: function(elem){
	        txtv.touch.vars.prev = txtv.page.create(elem.data('prev'), true, -txtv.height);
	        txtv.touch.vars.next = txtv.page.create(elem.data('next'), true, txtv.height);
	    },
		getNearby: function(elem){                    
	        txtv.touch.vars.elem = elem;
	        
            // The calling elem needs to be properly loaded to know which its nearby pages are
            if(!elem.data('loaded')){
                elem.one('loaded',function(){
                    txtv.page.fetchNearby(elem);
                });
            } else {
                txtv.page.fetchNearby(elem);
            }
        }
    }
}

// Install as webapp if on iPhone
if(iphone && !navigator.standalone){
    $('#install').addClass('show');
} else {
    // A timeout seems to make the iPhone display the app before everything is loaded
    //setTimeout(txtv.init 2);
    txtv.init();
}

// Titanium sniffs files for modules, and needs a dummy reference to the UI module to build properly
if (window.Titanium) {
    var version = Titanium.version;
    var UI = Titanium.UI;
}
