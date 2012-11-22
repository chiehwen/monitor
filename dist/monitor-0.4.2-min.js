/* monitor - v0.4.2 - 2012-11-21 */
(function(a){var b=typeof exports!="undefined",c=b?require("backbone"):a.Backbone,d=b?require("underscore")._:a._,e=b?require("cron"):null,f=c.Model.extend({defaults:{id:"",name:"",probeClass:"",initParams:{},hostName:"",appName:"",appInstance:0},initialize:function(a,b){},connect:function(a){var b=this;f.getRouter().connectMonitor(b,function(c){a&&a(c),c||(b.trigger("connect"),b.change())})},getConnection:function(){var a=this;return a.probe&&a.probe.connection?a.probe.connection:null},isConnected:function(){var a=this;return a.probe!=null},disconnect:function(a){var b=this,c="manual_disconnect";f.getRouter().disconnectMonitor(b,c,function(c,d){a&&a(c),c||b.trigger("disconnect",d)})},control:function(a,b,c){typeof b=="function"&&(c=b,b=null),c=c||function(){};var d=this,e=d.probe;if(!e)return c("Probe not connected");e&&e.connection?e.connection.emit("probe:control",{probeId:d.get("probeId"),name:a,params:b},c):e.onControl(a,b,c)},toProbeJSON:function(a){var b=this,c={id:b.get("probeId")};return d.each(b.toJSON(a),function(a,d){d in b.defaults||(c[d]=a)}),c},toMonitorJSON:function(a){var b=this,c={};return d.each(b.toJSON(a),function(a,d){d in b.defaults&&(c[d]=a)}),c},toServerString:function(){return f.toServerString(this.toMonitorJSON())}});f.generateUniqueId=function(){function a(){return((1+Math.random())*65536|0).toString(16).substring(1)}return a()+a()+"-"+a()+"-"+a()+"-"+a()+"-"+a()+a()+a()},f.generateUniqueCollectionId=function(a,b){var c="";return b=b||"",a.idSequence||(a.idSequence=0,a.forEach(function(c){var d=c.get("id")||"",e=+d.substr(b.length);a.idSequence<=e&&(a.idSequence=e+1)})),b+a.idSequence++},f.getRouter=function(){return f.defaultRouter||(f.defaultRouter=new f.Router,a.io&&f.defaultRouter.setGateway({socket:a.io.connect()})),f.defaultRouter},f.toServerString=function(a){var b=a.hostName;return a.appName&&(b+=":"+a.appName,a.appInstance&&(b+=":"+a.appInstance)),b},f.List=c.Collection.extend({model:f});var g={appName:"unknown",serviceBasePort:42e3,portsToScan:20,allowExternalConnections:!1};b?(f.Config=require("config"),f.Config.setModuleDefaults("Monitor",g)):f.Config={Monitor:g},f._=d,f.Backbone=c,f.Cron=e,f.commonJS=b,b?module.exports=f:a.Monitor=f})(this),function(a){var b=a.Monitor||require("./Monitor"),c=b.Cron,d=b._,e=b.Backbone,f=b.Probe=e.Model.extend({defaults:{id:null},initialize:function(a,b){},release:function(){},onControl:function(a,b,c){b=b||{},c=c||function(){};var d=this,e=d[a+"_control"],f;if(!e)return c({msg:"No control function: "+a});try{e.call(d,b,c)}catch(g){f="Error calling control: "+d.probeClass+":"+a,console.error(f,g),c({msg:f})}},ping_control:function(a,b){return b(null,"pong")}});f.classes={},f.extend=function(a){var b=this,c=e.Model.extend.apply(b,arguments);return a.probeClass&&(f.classes[a.probeClass]=c),c},f.List=e.Collection.extend({model:f})}(this),function(a){var b=a.Monitor||require("./Monitor"),c=b.Cron,d=b._,e=b.Backbone,f=b.Config,g=a.io||require("socket.io-client"),h=b.Probe,i=b.Connection=e.Model.extend({defaults:{hostName:"",hostPort:null,url:null,socket:null,gateway:!1,firewall:!1,remoteHostName:null,remoteAppName:null,remotePID:0,remoteProbeClasses:[],remoteGateway:!1,remoteFirewall:!1},initialize:function(a){var b=this;b.connecting=!0,b.connected=!1,b.socketEvents=null,b.remoteProbeIdsByKey={},b.remoteProbesById={},b.incomingMonitorsById={},a.socket?b.bindConnectionEvents():a.url||a.hostName&&a.hostPort?b.connect():console.error("Connection must supply a socket, url, or host name/port")},connect:function(){var a=this,b=a.get("hostName"),c=a.get("hostPort"),d=a.get("url");d||(d=a.attributes.url="http://"+b+":"+c);var e={transports:["websocket","xhr-polling"],"force new connection":!0,reconnect:!1},f=g.connect(d,e);a.set({socket:f}).bindConnectionEvents()},ping:function(a){var b=this;a=a||function(){};var c=function(){b.off("pong",c),a()};b.on("pong",c),b.emit("connection:ping")},disconnect:function(a){var b=this,c=b.get("socket");b.connecting=!1,b.connected=!1,b.socketEvents&&(b.removeAllEvents(),c.disconnect(),b.trigger("disconnect",a))},isThisHost:function(a){var b=this,c=a.toLowerCase(),d=b.get("hostName"),e=b.get("remoteHostName");return d=d&&d.toLowerCase(),e=e&&e.toLowerCase(),c===d||c===e},emit:function(){var a=this,b=a.get("socket");b.emit.apply(b,arguments)},addEvent:function(a,b){var c=this,d=c.get("socket");c.socketEvents=c.socketEvents||{};if(c.socketEvents[a])throw new Error("Event already connected: "+a);return d.on(a,b),c.socketEvents[a]=b,c},removeEvent:function(a){var b=this,c=b.get("socket");return b.socketEvents&&b.socketEvents[a]&&(c.removeListener(a,b.socketEvents[a]),delete b.socketEvents[a]),b},removeAllEvents:function(){var a=this,b=a.get("socket");for(var c in a.socketEvents)b.removeListener(c,a.socketEvents[c]);return a.socketEvents=null,a},bindConnectionEvents:function(){var a=this,c=a.get("socket");if(a.socketEvents)throw new Error("Already connected");a.socketEvents={},a.addEvent("connect_failed",function(){a.trigger("error","connect failed"),a.disconnect("connect failed")}),a.addEvent("disconnect",function(){a.disconnect("remote_disconnect")}),a.addEvent("error",function(b){a.trigger("error",b),a.disconnect("connect error")}),a.addEvent("probe:connect",a.probeConnect.bind(a)),a.addEvent("probe:disconnect",a.probeDisconnect.bind(a)),a.addEvent("probe:control",a.probeControl.bind(a)),a.addEvent("connection:ping",function(){c.emit("connection:pong")}),a.addEvent("connection:pong",function(){a.trigger("pong")}),a.addEvent("connection:info",function(b){a.set({remoteHostName:b.hostName,remoteAppName:b.appName,remotePID:b.pid,remoteProbeClasses:b.probeClasses,remoteGateway:b.gateway,remoteFirewall:b.firewall}),a.connecting=!1,a.connected=!0,a.trigger("connect")}),c.emit("connection:info",{hostName:b.getRouter().getHostName(),appName:f.Monitor.appName,pid:typeof process=="undefined"?0:process.pid,probeClasses:d.keys(h.classes),gateway:a.get("gateway"),firewall:a.get("firewall")})},probeConnect:function(a,c){c=c||function(){};var d=this,e=b.getRouter(),f=d.get("gateway"),g=d.get("firewall");if(g)return c("firewalled");e.determineConnection(a,f,function(g,h){if(g)return c(g);if(h&&!f)return c("Not a gateway");var i=function(e,f){if(e)return c(e);var g=new b(a),h=f.get("id");g.set("probeId",h),d.incomingMonitorsById[h]=g,g.probe=f,g.probeChange=function(){d.emit("probe:change:"+h,f.changedAttributes())},c(null,f.toJSON()),f.on("change",g.probeChange)};h?e.connectExternal(a,h,i):e.connectInternal(a,i)})},probeDisconnect:function(a,c){c=c||function(){};var d=this,e=b.getRouter(),f=a.probeId,g=d.incomingMonitorsById[f],h=d.get("firewall");if(h)return c("firewalled");if(!g||!g.probe)return c("Probe not connected");var i=function(a){return a?c(a):(g.probe.off("change",g.probeChange),g.probe=g.probeChange=null,delete d.incomingMonitorsById[f],c(null))},j=g.probe;j&&j.connection?e.disconnectExternal(j.connection,f,i):e.disconnectInternal(f,i)},probeControl:function(a,c){c=c||function(){};var d=this,e=b.getRouter(),f=d.get("firewall");if(f)return c("firewalled");var g=e.runningProbesById[a.probeId];if(!g){var h=d.incomingMonitorsById[a.probeId];return h?h.control(a.name,a.params,function(a,b){c(a,b)}):c("Probe id not found: "+a.probeId)}return g.onControl(a.name,a.params,c)}});i.List=e.Collection.extend({model:i})}(this),function(a){var b=a.Monitor||require("./Monitor"),c=b.Config,d=b._,e=b.Backbone,f=b.Connection,g=b.commonJS?require("http"):null,h=a.io||require("socket.io"),i=b.Server=e.Model.extend({initialize:function(a){var b=this;b.isListening=!1,b.connections=new f.List},start:function(a,b){typeof a=="function"&&(b=a,a=null),a=a||{},b=b||function(){};var d=this,e=d.get("server"),f,h=a.port||c.Monitor.serviceBasePort,i=a.attempt||1,j=c.Monitor.allowExternalConnections;if(i>c.Monitor.portsToScan)return f={err:"connect:failure",msg:"no ports available"},console.error("Server start",f),b(f);if(e)d.bindEvents(b);else{e=g.createServer(),e.on("error",function(a){d.get("port")||d.start({port:h+1,attempt:i+1},b)});var k=j?"0.0.0.0":"127.0.0.1";e.listen(h,function(){d.set({server:e,port:h}),d.bindEvents(b)})}},bindEvents:function(a){var c=this,d=c.get("server");d.on("clientError",function(a){console.error("Client error detected on server",a),c.trigger("error",a)}),d.on("close",function(a){d.hasEmittedClose=!0,c.stop()});var e={log:!1};c.socketServer=h.listen(d,e),c.socketServer.sockets.on("connection",function(a){var d=b.getRouter().addConnection({socket:a,gateway:c.get("gateway")});c.connections.add(d);var e=function(a){c.connections.remove(d),b.getRouter().removeConnection(d),d.off("disconnect",e)};d.on("disconnect",e)}),c.isListening=!0,a&&a(null),c.trigger("start")},stop:function(a){var c=this,d=c.get("server"),e=b.getRouter();return a=a||function(){},c.isListening?(c.connections.each(e.removeConnection,e),c.connections.reset(),c.isListening=!1,d.close(),c.trigger("stop"),a()):a()}});i.List=e.Collection.extend({model:i})}(this),function(a){var b=a.Monitor||require("./Monitor"),c=b.Cron,d=b._,e=b.Backbone,f=b.Config,g=b.Probe,h=b.Connection,i=b.Server,j=a.io||require("socket.io"),k=b.commonJS?require("os").hostname():null,l=b.Router=e.Model.extend({initialize:function(){var a=this;a.defaultGateway=null,a.firewall=!1,a.connections=new h.List,a.runningProbesByKey={},a.runningProbesById={}},setFirewall:function(a){var c=b.getRouter();c.firewall=a},setGateway:function(a){var b=this;return a.gateway=!1,a.firewall=!0,b.defaultGateway=b.addConnection(a)},getHostName:function(){var c=a.localStorage;return k||(c&&(k=c.hostName),k=k||b.generateUniqueId(),c&&(c.hostName=k)),k},setHostName:function(a){k=a},addConnection:function(a){var c=this;d.isUndefined(a.firewall)&&(a=d.extend({},a,{firewall:c.firewall})),a.id=b.generateUniqueCollectionId(c.connections);var e=new h(a),f=function(){c.trigger("connection:add",e)},g=function(){c.removeConnection(e),e.off("connect",f),e.off("disconnect",f)};return e.on("connect",f),e.on("disconnect",g),c.connections.add(e),e},removeConnection:function(a){var b=this;a.disconnect("connection_removed"),b.connections.remove(a),b.trigger("connection:remove",a)},connectMonitor:function(a,b){b=b||function(){};var c=this,d=a.toMonitorJSON(),e=null,f=d.probeClass;if(!f)return b("probeClass must be set");c.determineConnection(d,!0,function(f,g){if(f)return b(f);var h=function(c,d){if(c)return b(c);e=d.toJSON(),e.probeId=e.id,delete e.id,a.probe=d,a.set(e,{silent:!0}),a.probeChange=function(){a.set(d.changedAttributes())},d.on("change",a.probeChange),b(null)};g?c.connectExternal(d,g,h):c.connectInternal(d,h)})},disconnectMonitor:function(a,b,c){c=c||function(){};var d=this,e=a.probe,f=a.get("probeId");if(!e)return c("Monitor must be connected");var g=function(d){return d?c(d):(e.off("change",a.probeChange),a.probe=a.probeChange=null,a.set({probeId:null}),c(null,b))};e.connection?d.disconnectExternal(e.connection,f,g):d.disconnectInternal(f,g)},buildProbeKey:function(a){var b=a.probeClass,c=a.initParams;return c&&d.keys(c).sort().forEach(function(a){b+=":"+a+"="+c[a]}),b},determineConnection:function(a,c,d){var e=this,h=null,i=a.probeClass,j=a.hostName,k=a.appName,l=a.appInstance,m=e.getHostName().toLowerCase(),n=f.appName,o=function(b){b||(delete a.hostName,delete a.appName,delete a.appInstance);var c=function(){f(),d(null,h)},e=function(a){f(),d({msg:"connection error",err:a})},f=function(){h.off("connect",c),h.off("error",e)};if(h&&h.connecting){h.on("connect",c),h.on("error",e);return}return h&&!h.connected?(h.on("connect",c),h.on("error",e),h.connect(d)):d(null,h)};j=j?j.toLowerCase():null;if(!!j&&j!==m||!!k&&k!==n){h=e.findConnection(j,k,l);if(h)return o();if(j&&c){e.addHostConnections(j,function(c){return c?d(c):(h=e.findConnection(j,k,l),h?o():e.defaultGateway?(h=e.defaultGateway,o(!0)):d({err:"No route to host: "+b.toServerString(a)}))});return}return j?d({msg:"Not a gateway to remote monitors"}):d({msg:"No host specified for app: "+k},null)}return g.classes[i]!=null?d(null,null):e.defaultGateway?(h=e.defaultGateway,o(!0)):d({err:'Probe class "'+i+'" not available in this process'})},findConnection:function(a,b,c){var d=this,e=0;return d.connections.find(function(d){var f=!a||d.isThisHost(a),g=!b||b===d.get("remoteAppName"),h=d.get("remoteFirewall");return!h&&f&&g?e++===c:!1})},findConnections:function(a,b){var c=this;return c.connections.filter(function(c){var d=!a||c.isThisHost(a),e=!b||b===c.get("remoteAppName"),f=c.get("remoteFirewall");return!f&&d&&e})},addHostConnections:function(a,b){var c=this,d=[],e=f.Monitor.serviceBasePort,g=f.Monitor.serviceBasePort+f.Monitor.portsToScan-1;c.connections.each(function(b){var c=b.get("hostName").toLowerCase(),f=b.get("hostPort");c===a&&f>=e&&f<=g&&d.push(f)});var h=f.Monitor.portsToScan-d.length;if(h===0)return b();var i=function(){var a=this;a.off("connect disconnect error",i);if(--h===0)return b()};for(var j=e;j<=g;j++)if(d.indexOf(j)<0){var k=c.addConnection({hostName:a,hostPort:j});k.on("connect disconnect error",i,k)}},connectInternal:function(a,c){var d=this,e=d.buildProbeKey(a),f=a.probeClass,h=a.initParams,i=null,j=function(a){setTimeout(function(){if(a){if(i){delete d.runningProbesByKey[e],delete d.runningProbesById[i.id];try{i.release()}catch(b){}}return c(a)}i.refCount++,c(null,i)},0)};i=d.runningProbesByKey[e];if(!i){var k=g.classes[f];if(!k)return j({msg:"Probe not available: "+f});var l={asyncInit:!1,callback:j};try{i=new k(h,l),i.set({id:b.generateUniqueId()}),i.refCount=0,i.probeKey=e,d.runningProbesByKey[e]=i,d.runningProbesById[i.id]=i}catch(m){var n={msg:"Error instantiating probe "+f,error:m};return console.error(n),j(n)}if(l.asyncInit)return}j()},disconnectInternal:function(a,b){var c=this,d=c.runningProbesById[a];if(!d)return b("Probe not running");if(--d.refCount===0){try{d.release()}catch(e){}delete c.runningProbesByKey[d.probeKey],delete c.runningProbesById[a]}b(null,d)},connectExternal:function(a,c,d){var e=this,f=e.buildProbeKey(a),h=c.remoteProbeIdsByKey[f],i=c.remoteProbesById[h];if(!i){c.emit("probe:connect",a,function(e,j){return e?(console.error("Cannot connect to probeClass '"+a.probeClass+"' on "+b.toServerString(a),a,e),d(e)):(h=j.id,i=c.remoteProbesById[h],i?(i.refCount++,d(null,i)):(i=new g(j),i.refCount=1,i.connection=c,c.remoteProbeIdsByKey[f]=h,c.remoteProbesById[h]=i,c.addEvent("probe:change:"+h,function(a){i.set(a)}),d(null,i)))});return}return i.refCount++,d(null,i)},disconnectExternal:function(a,b,c){var d=this,e=a.remoteProbesById[b];if(!e)return c("Probe not running");if(--e.refCount===0)return e.release(),e.connection=null,delete a.remoteProbesById[b],delete a.remoteProbeIdsByKey[e.probeKey],a.removeEvent("probe:change:"+b),a.emit("probe:disconnect",{probeId:b},function(b){return b&&console.log("Probe disconnect error from host : "+a.get("hostName"),b),c(b)});c(null)}})}(this);