Ti.UI.setBackgroundColor('#000');

var win = Ti.UI.createWindow({
    backgroundColor: '#000',
    fullscreen: true,
    orientationModes: [
        Titanium.UI.PORTRAIT,
        Titanium.UI.UPSIDE_PORTRAIT,
        Titanium.UI.LANDSCAPE_LEFT,
        Titanium.UI.LANDSCAPE_RIGHT,
        Titanium.UI.FACE_UP,
        Titanium.UI.FACE_DOWN
    ]
});

var webview = Ti.UI.createWebView({
    backgroundColor: '#000',
    url: 'index.html'
});
win.add(webview);
win.open();

var numField = Titanium.UI.createTextField({
    backgroundColor: 'transparent',
    color: 'transparent',
    opacity: 0.1,
    top: 0,
    left: 0,
    width:80,
    height: 80,
    keyboardType: Titanium.UI.KEYBOARD_NUMBER_PAD,
    returnKeyType:Titanium.UI.RETURNKEY_DEFAULT,
    borderStyle:Titanium.UI.INPUT_BORDERSTYLE_NONE,
    appearance: Titanium.UI.KEYBOARD_APPEARANCE_ALERT

});
win.add(numField);

numField.addEventListener('change', function(e){    
    Ti.App.fireEvent('numFieldChange', {
        value: e.value
    });
    if(e.value.length == 3){
        numField.blur();
    }
});

numField.addEventListener('blur', function(e){    
    Ti.App.fireEvent('numFieldBlur', {
        value: e.value
    });
    numField.value = '';
});

Ti.Gesture.addEventListener('orientationchange', function(e){
    switch(e.orientation){
        case 1:
        case 2:
        win.width = 320;
        webview.width = 320;
        
        Ti.App.fireEvent('orientationchange', {orientation: 'portrait'});
        break;
        
        case 3:
        case 4:
        win.width = 480;
        webview.width = 480;
        Ti.App.fireEvent('orientationchange', {orientation: 'landscape'});
        break;
    }
    numField.blur();
});

Ti.Gesture.addEventListener('shake', function(){
    Ti.App.fireEvent('shake', {});    
});

var window = this;
var xhrProcessor = function(data){    
    var previousPage = data.match(/nextPage = "(\d+).html"/)[1],
        nextPage = data.match(/previousPage = "(\d+).html"/)[1],
        rawString = data
            .substring(data.indexOf('<pre'), data.lastIndexOf('</pre>') + 6) // Extract all pages
            .replace(/<a class="preclass".*<\/a>/g, "")
            .replace(/background: url.*?\.gif\)/g, '') // Remove ugly background images
            .replace(/href="(\d{3}).html"/g, function(all, sub){ 
                return 'href="#" rel="'+sub+'"';
            })
    
    return {
        data: rawString,
        prev: previousPage,
        next: nextPage
    };
}
Ti.include('js/xhr_cross_domain_app.js');
