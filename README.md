# jquery.hijack

This jquery plugin allows links and forms to be "ajaxified" so that their default get/post behaviour is replaced with ajax calls. The returned content is then injected into the target container.

## Installation

Include script *after* the jQuery library (unless you are packaging scripts in an alternative manner):

    <script src="/path/to/jquery.hijack.js"></script>

## Usage

Setup default values for future hijack request:

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
