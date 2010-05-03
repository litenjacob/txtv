// What events to use?
touchstart = 'ontouchstart' in document.documentElement ? 'touchstart' : 'mousedown';
touchmove = 'ontouchmove' in document.documentElement ? 'touchmove' : 'mousemove';
touchend = 'ontouchend' in document.documentElement ? 'touchend' : 'mouseup';

iphone = navigator.userAgent.match(/iPhone/i);

if ('Ti' in window) {
    var widths = {
        portrait: 320,
        landscape: 480
    }
    Ti.App.addEventListener('orientationchange', function(e){
        txtv.width = widths[e.orientation];
        document.body.className = e.orientation;
    });
}

// The singleton
var txtv = {
    pageChangeSensitivity : 50,
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

        // 100 is the start page
        txtv.page.create(100);

        // Kill movements
        document.addEventListener('touchmove', function(e){
            e.preventDefault();
            return false;    
        }, false);
        
        // Bind numpad events
        if ('Ti' in window) {
            Ti.App.addEventListener('numFieldChange', txtv.pagenum.change);
            Ti.App.addEventListener('numFieldBlur', txtv.pagenum.blur);
            Ti.App.addEventListener('shake', txtv.page.refresh);
        }
        
        document.addEventListener(touchstart, txtv.touch.start, false);
        document.addEventListener(touchmove, txtv.touch.move, false);
        document.addEventListener(touchend, txtv.touch.end, false);
        document.addEventListener('webkitTransitionEnd', txtv.touch.animEnd, false);
        
        var dirs = [{
            name: 'top',
            diffY: 1,
            diffX: 0,
            dir: 'v'
        },
        {
            name: 'right',
            diffY: 0,
            diffX: -1,
            dir: 'h'
        },
        {
            name: 'bottom',
            diffY: -1,
            diffX: 0,
            dir: 'v'
        },
        {
            name: 'left',
            diffY: 0,
            diffX: 1,
            dir: 'h'
        }]
        dirs.forEach(function(dir){
            document.getElementById(dir.name).addEventListener(touchstart, function(opts){
                console.log('hi')
                var vars = txtv.touch.vars;
                vars.touching = true;
                vars.dir = dir.dir;
                vars.at.y = 0;
                vars.at.x = 0;
                txtv.touch.end({ pageY: dir.diffY * txtv.pageChangeSensitivity, pageX: dir.diffX * txtv.pageChangeSensitivity,  });
            }, false);
        });
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
            var num = e.value;
            txtv.pagenum.update(num);
        },
        blur: function(e){          
            // Reset the page number of the page we're on
            var num = e.value;             
            // All page numbers consists of three digits, so move to page if we've got exactly three digits
            if(num.length == 3){
                txtv.page.create(num);
            } else {
                txtv.pagenum.update(txtv.touch.vars.elem.data('num'));
            }
        }
    },

    touch: {
        normalize: null,
        vars: {
            h: 0
        },
        start: function(e){
            //e.preventDefault();
            var t = e.changedTouches ? e.changedTouches[0] : e;    
            var vars = txtv.touch.vars;
            vars.at = {x: t.pageX, y: t.pageY }; // Touchdown!
            vars.touching = true;
        },
        move: function(e){
            if (txtv.touch.vars.touching) {
                var t = e.changedTouches ? e.changedTouches[0] : e;  
                var vars = txtv.touch.vars;
                var at = vars.at;
                var dir = vars.dir;
                
                if (!dir) {
                    if (Math.abs(t.pageY - at.y) > 10) { // Are we scrolling vertically?
                        vars.dir = 'v';
                    } else {
                        if (Math.abs(t.pageX - at.x) > 10) { // Or are we scrolling horizontally?
                            vars.dir = 'h';
                        }
                    }
                } else {
                    if(dir == 'v'){ // Perform vertical scroll
                        var diffY = t.pageY - at.y;
                        vars.prev.css('webkitTransform', 'translate3d(0px, ' + (diffY - txtv.height) + 'px, 0px)');
                        vars.elem.css('webkitTransform', 'translate3d(' + (vars.elem.data('h') || 0) + 'px, ' + (diffY) + 'px, 0px)');
                        vars.next.css('webkitTransform', 'translate3d(0px, ' + (diffY + txtv.height) + 'px, 0px)');
                    } else {
                        if(dir == 'h'){ // Perform horizontal subpage scroll
                            vars.elem.css('webkitTransform', 'translate3d(' + (-vars.h * txtv.width + t.pageX - at.x) + 'px, 0px, 0px)');
                        }
                    }
                    
                }
            }
            return false;
        },
        end: function(e){
            var vars = txtv.touch.vars;
            if (vars.touching) {
                var t = e.changedTouches ? e.changedTouches[0] : e;  
                vars.touching = false;
                
                if(!vars.dir){
                    var link = e.target.nodeName == 'A' ? e.target : (e.target.parentNode.nodeName == 'A' ? e.target.parentNode : false);
                    if(link){
                        txtv.page.create(link.rel);
                    }
                    return; 
                }
                
                if (vars.dir == 'v') {
                    
                    var diffY = t.pageY - vars.at.y;
                    var prevPos, elemPos, nextPos;
                    console.log(diffY);
                    
                    if (diffY >= txtv.pageChangeSensitivity) { // Going up
                        prevPos = 0;
                        elemPos = txtv.height;
                        nextPos = txtv.height * 2;
                        vars.activeElem = vars.prev;
                    }
                    else 
                        if (diffY <= -txtv.pageChangeSensitivity) { // Going down
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
                    var diffX = t.pageX - vars.at.x;
    
                    if (diffX < 50 && h + 1 <= children - 1) { // Going right, if possible
                        h++;
                    }
                    else 
                        if (diffX > -50 && h - 1 >= 0) { // Going left, if possible
                            h--;
                        }
                    
                    vars.elem.addClass('anim');
                    var dx = (-h * txtv.width);
                    vars.elem.css('webkitTransform', 'translate3d(' + dx + 'px, 0px, 0px)');
                    vars.elem.data('h', dx)
                    
                    vars.h = h;
                }
                
                vars.dir = null; // Reset direction
            }
        },
        animEnd: function(e){
            $(e.target).removeClass('anim'); // Remove anim class to be able to drag page again
            if(e.target == txtv.touch.vars.elem[0]){
                var active = [txtv.touch.vars.prev[0], txtv.touch.vars.elem[0], txtv.touch.vars.next[0]];
                var pages = txtv.dom.pages.children().filter(function(){
                    return active.indexOf(this) == -1;
                }).hide();
            }
        }
    },
	page: {
        refresh: function(){
            var num = txtv.touch.vars.activeElem.data('num');
            $('#page' + num).remove();
            txtv.page.create(num);
        },
		request: function(num, callback, pos){
			// Create container
			var num = parseInt(num);
	        var $con = $('<div/>')
	            .attr('id', 'page' + num)
	            .append($('<div class="loader"><span>' + num + '</span></div>'))
	            .data('loaded', false)
	            .css('webkitTransform', 'translate3d(0px, ' + (pos) + 'px, 0px)');
	            
                var con = $con[0];
                
	            // Putting all pages in order
	            var anchor;
	            $(txtv.dom.pages.children()).each(function(i){
	                if($(this).data('num') < num){
	                    anchor = $(this);
	                }
	            })
	
	            if(anchor){
	                anchor.after($con);
	            } else {
	                txtv.dom.pages.append($con);
	            }
	            
	            $con.show()
	        
            var xhr = new XMLHttpRequest();
            xhr.onload = function(data){
                // SVT:s counting is upside down
                var previousPage = data.prev,
                    nextPage = data.next,
                    rawString = data.data;

                    $(rawString)
                        .filter(function(i,elem){ // Filter pages
                            return elem.nodeName == 'PRE';
                        })
                        .appendTo($con.empty())
                        .wrap('<div class="page"/>');

                previousPage = (num == 100 && previousPage == 100 ? 897 : previousPage);
                
                $con
                    .data('loaded', true)
                    .data('num', num)
                    .data('prev', previousPage)
                    .data('next', nextPage)
                    .trigger('loaded')
                
                if (callback) {
                    callback($con);
                }
            };
            
            xhr.onerror = function(){
                $con.remove();
            };
            
            xhr.open("GET", 'http://svt.se/svttext/web/pages/' + num + '.html');
            xhr.send();
            
            if(!pos){
                txtv.touch.vars.activeElem = $con;
            }
	        return $con;
	    },
		create: function(num, caching, pos){
		    var num = num || 100,
		        pos = pos || 0;

		    var page = $('#page' + num).show(); // Try fetching page from DOM
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
	        txtv.touch.vars.prev = txtv.page.create(elem.data('prev'), true, -txtv.height).show();
	        txtv.touch.vars.next = txtv.page.create(elem.data('next'), true, txtv.height).show();
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

txtv.init();