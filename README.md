jquery.hijack
=============
This jquery plugin allows links and forms to be "ajaxified" so that their default get/post behaviour is replaced with ajax calls.
The returned content is then injected into the target container. In addition this plugin offers some unique features such as global settings,
callbacks, recursive hijacking, conversion of inline form event handlers and setting options via inline data attributes.

Installation
============
Include script *after* the jQuery library (unless you are packaging scripts in an alternative manner):

    <script src="/path/to/jquery.hijack.js"></script>

Usage
=====
Here are some basic usage examples. For further detailed examples please see below...

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

    target (selector Default:parent())
Sets the target for the returned content. In addition it also defines the scope/context in which the ajax function runs.

    data (object,string Default:{})
Data to be serialized & sent to the server. It is the same option available within the jquery ajax method.

    recursive (boolean Default:false)
Setting this to true hijacks the new content.

    canRehijack (boolean Default:true)
Setting this to false will prevent (potential) subsequent hijack calls from overwriting the hijacked settings for a specific link or form.

    confirmHijack (function,string Default:returns true)
This callback is fired before hijacking is started. The passed function must return true or false. If the returned value of this callback returns anything but true then the hijacking is aborted.

    beforeHijack (function,string)
This callback is fired after the confirm hijack but before hijacking is started.

    afterHijack (function,string)
This callback is fired after the hijacking has completed, regardless of success or failure.

    onSuccess ( function,string Default: sets the target html with the xhr response)
This callback is fired when the ajax responds with success.

    onError ( function,string Default: alert box with xhr response)
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
    
Setting the data attribute inline: (**note:** JSON standard requires "double" quotes so it is important to remember that the attribute itself must be enclosed with 'single' quotes.)
    
    <div id="foo" data-hijack='{"hrefs":"false","recursive":"true"}'>
    
Shortcut toggling of links & forms via the data-hijack attribute: [1|0|true|false]

    <a data-hijack="0" href="/foo.html">This link will not be hijacked!</a>
    <form data-hijack="0" action="/foo.html">This form will not be hijacked!</form>
    
A few additional points to remember in regard to setting options:

 1. Data attributes take precedence over options passed as object args
 2. Options set directly on link & form tags take precendence over parent options.
 3. If hijack() is called on the same element more than once, any new options/data will overwrite previous settings. You can prevent this behaviour by setting the option canRehijack:false.

Events
======
There are two events that can be subscribed to.

**beforeHijack** fires after the confirmHijack callback but before the ajax request is made.

    $('a#foo').on('beforeHijack',function(){
        alert('This link is about to be hijacked!');
    });
    
**afterHijack** fires after the ajax request has responded with success or failure.

    $('a#foo').on('afterHijack',function(){
        alert('This link was hijacked!');
    });
    
Example 1
=============
This example shows how to hijack Links & Forms within a div. Notice that the second href has specifically set the data-hijack="0" so it nevers gets hijacked.

    <div id="ex1">
        <p>Lorem ipsum....</p>
        <a href="/foo.html">Continue</a>
        <form>
            Name: <input name="fname">
            <input type="submit">
        </form>
        <a href="/bar.html" data-hijack="0">I will never be hijacked!</a>
    </div>
     
    <script>
    $(function(){
        $('#ex1').hijack(); 
    });
    </script>
    
Example 2
=============
This example shows how to target alternative elements.

    <div id="ex2">
        <p>I am the source container</p>
        <a href="/foo.html">Continue</a>
        <form>
            Name: <input name="fname">
            <input type="submit">
        </form>
        <a href="/bar.html" data-hijack='{"target":"body"}'>I am going to rebel and target the body!</a>
    </div>
    
    <div id="ex2b">I am the target container</div>
     
    <script>
    $(function(){
        $('#ex2').hijack({target:$('ex2b')}); 
    });
    </script>

Example 3
=============
This example shows how to incorporate some type of 3rd party "loading,spinner,waiting" plugin with a confirmation before the hijack is sent.

    <div id="ex3">
        <p>Lorem Ipsum...</p>
        <a href="/foo.html">Continue</a>
    </div>
     
    <script>
    $(function(){
        $('#ex3').hijack({
            confirmHijack:function(){
                return confirm('Are you sure you want to do this?');
            },
            beforeHijack:function(){
                $(this).spinner('start'); //start example spinner plugin
            },
            afterHijack:function(){
                $(this).spinner('stop'); //stop example spinner plugin
            }
        }); 
    });
    </script>
    
Example 4
=============
This example shows how to use the onSuccess & onError callbacks. In this example the content of a successfull response will be loaded into a 3rd party popup plugin.

    <div id="ex4">
        <p>Lorem Ipsum...</p>
        <a href="/foo.html">Continue</a>
    </div>
     
    <script>
    $(function(){
        $('#ex4').hijack({
            onSuccess:function(data){
                $(this).popupModal(data);
            },
            onError:function(data){
                console.log("ERROR:",data);
            }
        }); 
    });
    </script>
    
Example 5
=============
This example shows how hijack plays nicely with inline form event handlers. In the example below, the inline onSubmit handler will fire first, then the confirmHijack() callback will fire.

    <div id="ex5">
        <form action="/foo.html" onsubmit="return confirm('Are you sure you want to submit?');">
            Name: <input name="fname">
            <input type="submit">
        </form>
    </div>
     
    <script>
    $(function(){
        $('#ex5').hijack({
            confirmHijack:function(){
                return confirm("Seriously, are you sure?");
            }
        }); 
    });
    </script>

Example 6
=============
This example shows how callbacks can be set as inline strings. **Note:** Format is functionName,arg1,arg2,etc

    <div id="ex6">
        <a data-hijack='{"confirmHijack":"My.Foo,Are you sure?"}' href="/foo.html">Continue</a>
    </div>
     
    <script>
    var My = {};
    My.Foo = function(s) {
        return confirm(s);
    };
    
    $(function(){
        $('#ex5').hijack(); 
    });
    </script>


Changelog
=========

Development
===========
- Source hosted at [GitHub](https://github.com/jlafosse/jquery-hijack)
- Report issues, questions, feature requests on [GitHub Issues](https://github.com/jlafosse/jquery-hijack/issues)

Authors
=======
[Jason LaFosse](https://github.com/jlafosse)


    