/**
 * Hijack v1.0.0 - jQuery Plugin
 * Copyright (c) 2012 Jason LaFosse
 * Licensed under MIT and GPL
*/
/**
 * The Hijack plugin allows links and forms to be "ajaxified" so that their default get/post behaviour is replaced with ajax calls.
 * The returned content is then injected into the target container. In addition this plugin offers some unique features such as global settings,
 * callbacks, recursive hijacking, conversion of inline form event handlers and setting options via inline data attributes.
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
            if (args.length<1) { args=null; }
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
        return self;
    }();
    
    // Defaults
    var hijackSettings = {
        hrefs:true,
        forms:true,
        data:null,
        recursive:true,
        canRehijack:true,
        target:null,
        context:null,
        confirmHijack:function(){ return true; },
        beforeHijack:function(data){},
        afterHijack:function(data){},
        onSuccess:function(data,textStatus,jqXHR) { $(this).html(data); },
        onError:function(data,textStatus,jqXHR) { alert('ERROR: ' + data); }
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

        // hijack <a> tags
        var _hijackHref = function($atag,atagSettings){
            
            // check to ensure that href hijacking is enabled and that we have a valid href
            if ((!atagSettings.hrefs) || (!$atag.attr('href')) || ($atag.attr('href').match(/.*#$/))) { return; }
            
            // remove previous click event binding if already hijacked & can rehijack
            if ($atag.data('_hijacked')) {
                if (!atagSettings.canRehijack)  {
                    return;
                }
                $atag.unbind('submit.hijack').data('_hijacked',false);         
            }
            
            // bind the click event
            $atag.bind('click.hijack',function(e) {
                
                // prevent default
                e.preventDefault();

                // set target
                var $target = $(atagSettings.target);
                
                // set context
                var $context = (util.isEmpty(atagSettings.context)) ? $target : $(atagSettings.context);

                // confirmHijack callback
                if (!_executeCallback(atagSettings.confirmHijack,$context)) {
                    return;
                }
                
                // trigger custom event
                $atag.trigger('beforeHijack');
                
                // beforeHijack callback
                _executeCallback(atagSettings.beforeHijack,$context,[atagSettings]);
                
                // send the request
                $.ajax({ 
                    url:this.href,
                    data:atagSettings.data, 
                    success:function(data,textStatus,jqXHR){
                        if (!util.isEmpty(data.error)) {
                            _executeCallback(atagSettings.onError,this,[data,textStatus,jqXHR]);
                        } else {
                            _executeCallback(atagSettings.onSuccess,this,[data,textStatus,jqXHR]);
                            if (atagSettings.recursive) {
                                $(this).hijack(atagSettings);
                            }
                        }
                    
                        // trigger custom event
                        $atag.trigger('afterHijack');
                    
                        // callback
                        _executeCallback(atagSettings.afterHijack,this,[data]);
                    
                    }, 
                    context:$context
                });

            }).data('_hijacked',true);
            
        };
        
        // hijack <forms>
        var _hijackForm = function($ftag,ftagSettings){
            
            // check to ensure that form hijacking is enabled
            if (!ftagSettings.forms) { return; }
            
            // remove previous submit event binding if already hijacked & can rehijack
            if ($ftag.data('_hijacked')) {
                if (!ftagSettings.canRehijack)  {
                    return;
                }
                $ftag.unbind('submit.hijack').data('_hijacked',false);         
            }

            // get reference to actual form el
            var ftag = $ftag.get(0);

            // check for inline handlers, remove and add via jquery bind
            for (i=0; i<ftag.attributes.length; i++) {
                if (ftag.attributes[i].specified) {
                    var n = ftag.attributes[i].nodeName.toString().toLowerCase();
                    var r = n.match(/^on([a-z]+)/);
                    if (!util.isEmpty(r)) {
                        var type = r[1];
                        var fn = ftag.attributes[i].nodeValue.toString();
                        var handler = new Function(fn);
            
                        // remove inline handler
                        $ftag.removeAttr(n);
                        
                        // bind inline handler and push to front of stack
                        $ftag.bind(type, handler);
                        var events = $ftag.data('events')[type];
                        events.unshift(events.pop());
                        $ftag.data('events')[type] = events;
            
                    }
                }
            }   
    
            $ftag.bind('submit.hijack',function(e) {
                
                // prevent default
                e.preventDefault();
                
                // get boolean result of function if one exists (i.e. inline onsubmit)
                if ((util.isBoolean(e.result))&&(!e.result)) { 
                    return; 
                }
                
                // set target
                var $target = $(ftagSettings.target);
                
                // set context
                var $context = (util.isEmpty(ftagSettings.context)) ? $target : $(ftagSettings.context);
                
                // confirmHijack callback
                if (!_executeCallback(ftagSettings.confirmHijack,$context)) {
                    return;
                }
                
                // trigger custom event
                $ftag.trigger('beforeHijack');
                
                // beforeHijack callback
                _executeCallback(ftagSettings.beforeHijack,$context,[ftagSettings]);
                
                // submit the form
                $.ajax({
                    url:ftag.action,
                    data:$ftag.serialize() + "&" + $.param(ftagSettings.data), 
                    success:function(data,textStatus,jqXHR){
                        if (!util.isEmpty(data.error)) {
                            _executeCallback(ftagSettings.onError,this,[data,textStatus,jqXHR]);
                        } else {
                            _executeCallback(ftagSettings.onSuccess,this,[data,textStatus,jqXHR]);
                            if (ftagSettings.recursive) {
                                $(this).hijack(ftagSettings);
                            }
                        }
                    
                        // trigger custom event
                        $ftag.trigger('afterHijack');
                    
                        // afterHijack callback
                        _executeCallback(ftagSettings.afterHijack,this,[data]);
                    
                    },
                    context:$context
                });
     
                return false;
                
            }).data('_hijacked',true);
            
        };
        
        return this.each(function(){
            
            var $self = $(this);

            // check for data-hijack='[1|0|true|false]'
            var data = $self.data('hijack');
            if (util.isBoolean(data)||util.isNumber(data)) {
                $self.data('hijack',{hrefs:data,forms:data});  
            }

            // merge options & data
            var optionsData = $.extend(true,{},options,$self.data('hijack'));
            
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