/**
 * Hijack v1.1.0 - jQuery Plugin
 * Copyright (c) 2012 Jason LaFosse
 * Licensed under MIT and GPL
*/

/**
 * The Hijack plugin allows links and forms to be "ajaxified" so that their default get/post behaviour is replaced with ajax calls.
 * The returned content is then injected into the target container. In addition this plugin offers some unique features such as global settings,
 * callbacks, rehijack hijacking, conversion of inline form event handlers and setting options via inline data attributes.
 *
 * Hijack
 * Basic Usage: $(this).hijack({..});
*/
;(function($) {
    
    // Some util/convenience functions
    var util = function() {
        var self = {};
        self.isNull = function(o) {
            return o === null;
        };
        self.isUndefined = function(o) {
            return typeof o === 'undefined';
        };
        self.isEmpty = function(o) {
            return o == '' || self.isNull(o) || self.isUndefined(o);
        };
        self.isString = function(o) {
            return typeof o === 'string';
        };
        self.isBoolean = function(o) {
            return typeof o === 'boolean';
        };
        self.isNumber = function(o) {
            return typeof o === 'number' && isFinite(o);
        };
        self.stringToBoolean = function(v) {
            if (!self.isString(v)) { return v; }
            switch(v.toLowerCase()){
                case "true": case "yes": case "1": return true;
                case "false": case "no": case "0": case null: return false;
                default: return Boolean(v);
            }
        };
        self.executeFunctionByName = function(functionName, scope /*,args*/) {
            var args = Array.prototype.slice.call(arguments, 2);
            if (args.length<1) {
                args = arguments;
            }
            var namespaces = functionName.split(".");
            var func = namespaces.pop();
            var context = window;
            for (var i = 0; i < namespaces.length; i++) {
                context = context[namespaces[i]];
            }
            try {
                return context[func].apply(scope, args);
            } catch(e) {
                alert(e);
                return null;
            } 
        };
        self.objectKey = function(obj, prop, val){
            if (self.isEmpty(prop)) {
                return val ? (obj = val) : obj;
            }
            var props = prop.split('.'),
                keys = props.pop(), p;
            
            while (p = props.shift()) {
                if (typeof obj[p] === 'undefined') {
                    return undefined;
                }
                obj = obj[p];
            }
            return val ? (obj[keys] = val) : obj[keys];
        }
        return self;
    }();
    
    // Defaults
    var hijackSettings = {
        hrefs:true,
        forms:true,
        data:{},
        rehijack:true,
        rehijackKey:null,
        canOverwrite:true,
        target:null,
        context:null,
        confirmHijack:function(){ return true; },
        beforeHijack:function(){},
        afterHijack:function(jqXHR,textStatus,settings){},
        onSuccess:function(data,textStatus,jqXHR,settings) { console.log('success:',data) },
        onError:function(jqXHR,textStatus,error,settings) { console.log('error:', error) }
    };
    
    // Allow defaults to be set globally
    $.extend({
        hijackSetup:function(settings){
            $.extend(true,hijackSettings,settings);
        }
    });
    
    // create the plugin
    $.fn.hijack = function(options){

        options = options || {};

        // default settings
        var defaults = hijackSettings;
        
        // executes callback funcs and callback strings
        var _executeCallback = function(callback,context,args) {
            if (util.isEmpty(callback)) { return; }
            
            // ie does not like null args in apply() method
            if (util.isEmpty(args)) {
                args = arguments;
            }

            if ($.isFunction(callback)) {
                return callback.apply(context,args);
            }
            
            if (util.isString(callback)) {
                args = callback.split(",");
                var funcname = args.shift();
                return util.executeFunctionByName(funcname,context,args);
            }

            return;
        };
        
        // rehijack - by default hijacks data unless obj key is specified
        var _rehijack = function(data,settings) {

            var content = util.objectKey(data,settings.rehijackKey);
            
            // ensure that the key contains data
            if (!util.isEmpty(content)) {
                var $content = $(content);
                $content.hijack(settings);
                util.objectKey(data,settings.rehijackKey,$content);
            }

            return data; 
        };
        
        // hijack <a> tags
        var _hijackHref = function($atag,atagSettings){
            
            // check to ensure that href hijacking is enabled and that we have a valid href
            if ((!atagSettings.hrefs) || (!$atag.attr('href')) || ($atag.attr('href').match(/.*#$/))) { return; }
            
            // remove previous click event binding if already hijacked
            if ($atag.data('_hijacked')) {
                if (!atagSettings.canOverwrite)  {
                    return;
                }
                $atag.unbind('click.hijack').data('_hijacked',false);         
            }
            
            // bind the click event
            $atag.bind('click.hijack',function(e) {
                
                // prevent default
                e.preventDefault();

                // set target
                var $target = $(atagSettings.target);
                
                // set context
                var $context = (util.isEmpty(atagSettings.context)) ? $target : $(atagSettings.context);
                
                // add original event
                $context._event = e;

                // confirmHijack callback
                if (!_executeCallback(atagSettings.confirmHijack,$context)) {
                    return false;
                }

                // trigger custom event
                $atag.trigger('beforeHijack');
                
                // beforeHijack callback
                _executeCallback(atagSettings.beforeHijack,$context,[atagSettings]);
                
                
                // set url & conext
                atagSettings.url = this.href;
                atagSettings.context = $context;
                
                // submit the form
                $.ajax(
                    $.extend(true,atagSettings,{
                        success:function(data,textStatus,jqXHR){
    
                            // remove old reference
                            $context = null;
    
                            // rehijack
                            if (atagSettings.rehijack) {
                                data = _rehijack(data,atagSettings);
                            }
                            
                            // onSuccess callback
                            _executeCallback(atagSettings.onSuccess,this,[data,textStatus,jqXHR,atagSettings]);
                            
                            // trigger custom event
                            $atag.trigger('afterHijack');
                        
                            // afterHijack callback
                            _executeCallback(atagSettings.afterHijack,this,[jqXHR,textStatus,atagSettings]);
                            

                        },
                        error:function(jqXHR,textStatus,error) {
                            _executeCallback(atagSettings.onError,this,[jqXHR,textStatus,error,atagSettings]);
                        }
                    
                    })
                );

            }).data('_hijacked',true);
            
        };
        
        // hijack <forms>
        var _hijackForm = function($ftag,ftagSettings){
            
            // check to ensure that form hijacking is enabled
            if (!ftagSettings.forms) { return; }
            
            // remove previous submit event binding if already hijacked
            if ($ftag.data('_hijacked')) {
                if (!ftagSettings.canOverwrite)  {
                    return;
                }
                $ftag.unbind('submit.hijack').data('_hijacked',false);         
            }

            // get reference to actual form el
            var ftag = $ftag.get(0);

            // check for inline submit handler, remove and add via jquery bind
            for (i=0; i<ftag.attributes.length; i++) {
                if (ftag.attributes[i].specified) {
                    var n = ftag.attributes[i].nodeName.toString().toLowerCase();
                    var r = n.match(/^on(submit)/);
                    if (!util.isEmpty(r)) {
                        var type = r[1];
                        var fnString = ftag.attributes[i].nodeValue.toString();
                        var handler = new Function(fnString);
                        
                        // wrap in function to force lexical scoping thus preventing default global anonymous via Function method...
                        var fn = function(){
                            return handler.apply(); 
                        }

                        // remove inline handler
                        $ftag.removeAttr(n);
                        
                        // bind inline handler and push to front of stack
                        $ftag.bind(type, fn);
                        
                        var handlers = $._data($ftag[0], 'events')['submit'];
                        handlers.unshift( handlers.pop() );
            
                    }
                }
            }


            $ftag.bind('submit.hijack',function(e) {
                
                // prevent default
                e.preventDefault();
                
                // get boolean result of potential previous submit handler
                if ((util.isBoolean(e.result))&&(!e.result)) {
                    e.stopImmediatePropagation();
                    return false; 
                }
                
                // get all submit handlers for this ftag
                var handlers = $._data($ftag[0], 'events')['submit'];
                
                // ensure that this submit event is the last, otherwise stopImmediatePropagation, re-order events & re-trigger
                if (handlers[handlers.length-1].namespace != 'hijack') {   
                    
                    e.stopImmediatePropagation();

                    for (var j=0; j<handlers.length; j++) {
                        
                        // already triggered? remove
                        if (handlers[j].namespace != 'hijack') {
                            handlers.splice(j,1);
                            j--;
                            continue;
                        }
                        
                        // not last? push to end and re-trigger
                        if ((handlers[j].namespace == 'hijack') && (j+1 != handlers.length)) {
                            handlers.push( handlers.splice(j,1).pop() );
                            $ftag.triggerHandler('submit');
                            return false;
                        }

                    }
                }
                
                // set target
                var $target = $(ftagSettings.target);

                // set context
                var $context = (util.isEmpty(ftagSettings.context)) ? $target : $(ftagSettings.context);
                
                // add original event
                $context._event = e;
                
                // confirmHijack callback
                if (!_executeCallback(ftagSettings.confirmHijack,$context)) {
                    return false;
                }
                
                // trigger custom event
                $ftag.trigger('beforeHijack');
                
                // beforeHijack callback
                _executeCallback(ftagSettings.beforeHijack,$context,[ftagSettings]);
                
                
                // set url & data
                ftagSettings.url = ftag.action;
                ftagSettings.data = (util.isString(ftagSettings.data)) ? ftagSettings.data : $.param(ftagSettings.data);
                ftagSettings.data += "&" + $ftag.serialize();
                ftagSettings.context = $context;
                
                // submit the form
                $.ajax(
                    $.extend(true,ftagSettings,{
                        success:function(data,textStatus,jqXHR){
    
                            // remove old reference
                            $context = null;
    
                            // rehijack
                            if (ftagSettings.rehijack) {
                                data = _rehijack(data,ftagSettings);
                            }
                            
                            // onSuccess callback
                            _executeCallback(ftagSettings.onSuccess,this,[data,textStatus,jqXHR,ftagSettings]);
                            
                            // trigger custom event
                            $ftag.trigger('afterHijack');
                        
                            // afterHijack callback
                            _executeCallback(ftagSettings.afterHijack,this,[jqXHR,textStatus,ftagSettings]);
                            

                        },
                        error:function(jqXHR,textStatus,error) {
                            _executeCallback(ftagSettings.onError,this,[jqXHR,textStatus,error,ftagSettings]);
                        }
                    
                    })
                );

                return false;
                
            }).data('_hijacked',true);
            
        };
        
        return this.each(function(){
            
            var $self = $(this),
                inlinedata;
            
            // skip TextNodes
            if (util.isEmpty($self.prop('tagName'))) {
                return;
            }
            
            // get "inline" data-hijack attribute
            if (!util.isEmpty($self.attr('data-hijack'))) {
                try {
                    inlinedata = $.parseJSON( $self.attr('data-hijack') );
                } catch(e) {console.log( e );}
            }
 
            // check for data-hijack='[1|0|true|false]'
            if (util.isBoolean(inlinedata)||util.isNumber(inlinedata)) {
                inlinedata = {hrefs:inlinedata,forms:inlinedata};
            }

            // merge data, options & inline data
            var optionsData = $.extend(true,{},$self.data('hijack'),options,inlinedata);
            
            // convert strings to booleans
            optionsData.hrefs = util.stringToBoolean(optionsData.hrefs);
            optionsData.forms = util.stringToBoolean(optionsData.forms);

            // save orignal options & data
            $self.data('hijack',optionsData);
            
            // merge settings
            var settings = $.extend(true,{},defaults,optionsData);
            
            // hijack child <a> & <form> tags
            $('a, form',$self).each(function(){
                optionsData._parent = $self;
                $(this).hijack(optionsData);
            });
            
            // set target if not defined
            if (util.isEmpty(settings.target)) {
                settings.target = settings._parent || $self.parent();
            }

            // hijack this <a> tag
            if ($self.prop('tagName').match(/a/i)) {
                _hijackHref($self,settings);
            }
            
            // hijack this <form> tag
            if ($self.prop('tagName').match(/form/i)) {
                _hijackForm($self,settings);
            }            

        });

    };

})(jQuery);