jquery.hijack
=============
This jquery plugin allows links and forms to be "ajaxified" so that their default get/post behaviour is replaced with ajax calls. The returned content is then injected into the target container.

Installation
============
Include script *after* the jQuery library (unless you are packaging scripts in an alternative manner):

    <script src="/path/to/jquery.hijack.js"></script>

Usage
=====
Setup default values for future hijack requests:

    $.hijackSetup({
        data:{layout:'blank'},
        onSuccess:function(data) {
            $(this).html("<b>"+data+"</b>"); 
        }
    });

Hijack using defaults:

    $('#foo').hijack();

Hijack only forms:

    $('#foo').hijack({hrefs:false});
    
Hijack with an alternative target:

    $('#foo').hijack({target:'#bar'});
    
Hijack content recursively:

    $('#foo').hijack({recursive:true});
    
Hijack using a confirm callback

    $('#foo').hijack({
        confirmHijack:function(){
            return confirm("Are you sure?");
        }
    });
    
Hijack using a before callbacks to show a loading message

    $('#foo').hijack({
        beforeHijack:function(){
            $(this).html('Loading...');
        }
    });
    
Hijack using an after callback to log a result

    $('#foo').hijack({
        afterHijack:function(data){
            console.log(data);
        }
    });

Available Options
=================

    hrefs (boolean Default:true)
Toggles hijacking of links on/off.

    forms (boolean Default:true)
Toggles hijacking of forms on/off.

    data (object,string Default:{})
Data to be serialized & sent to the server. It is the same option available within the jquery ajax method.

    recursive (boolean Default:false)
Setting this to true hijacks the new content.

    canRehijack (boolean Default:true)
Setting this to false will prevent (potential) subsequent hijack calls from overwriting the hijacked settings for a specific link or form.

    confirmHijack (function Default:returns true)
This callback is fired before hijacking is started. The passed function must return true or false. If the returned value of this callback returns anything but true then the hijacking is aborted.

    beforeHijack (function)
This callback is fired after the confirm hijack but before hijacking is started.

    afterHijack (function)
This callback is fired after the hijacking has completed, regardless of success or failure.

    onSuccess ( function Default: sets the target html with the xhr response)
This callback is fired when the ajax responds with success.

    onError ( function Default: alert box with xhr response)
This callback is fired when the ajax responds with an error.

Setting Options
===============
Options can be set in various ways:

Using the global $.hijackSetup() function. This will set the default options for all subsequent hijack requests.
    
    $.hijackSetup({hrefs:false});
    
As object arguments:
     
     $('#foo').hijack({hrefs:false,recursive:true});
     
Using the jquery.data() method:
    
    $('#foo').data('hijack',{hrefs:false,recursive:true}).hijack();
    
Setting the data attribute inline:
    
    <div id="foo" data-hijack='{"hrefs":"false","recursive":"true"}'>
    