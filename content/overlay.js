/*
		Hush Tunnel v0.2
		
		Copyright (c) 2012 - 2013 Tamer Rizk (trizk@inficron.com)
		
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.


*/


var HUSHTUNNEL = new function() {
	
	var on = false;
	var pInit = false;
	var pPid = false;
	var reg = false;
	var winreg = false;
	var blocking = false;
	//uncomment the following line and use console.logStringMessage(''); to print debug messages to error console
  //var cons = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	//cons.logStringMessage('');
		
  var pwMan = Components.classes['@mozilla.org/login-manager;1'].getService(Components.interfaces.nsILoginManager); 	
	var nsLogin = new Components.Constructor('@mozilla.org/login-manager/loginInfo;1',Components.interfaces.nsILoginInfo,'init');
		                                             
	//WINNT,Linux, or Darwin
	var os = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULRuntime).OS.toUpperCase();  
	var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsILocalFile); 

  file.append('extensions');
	file.append('hushtunnel@congress.public');   
	file.append('components');
	
	var path=file.path;
  var prog = {
  	'USER':'',
   	'WINNT':'sstart.exe',
   	'LINUX':'/usr/bin/perl',
   	'DARWIN':'/usr/bin/perl',
    'UNKNOWN':'/usr/bin/perl',  		
  };
	if(os=='WINNT'){
		reg = Components.classes['@mozilla.org/windows-registry-key;1'].createInstance(Components.interfaces.nsIWindowsRegKey);
	}else if(!prog[os]){
		os='UNKNOWN';
	}	

  for (var i in prog){
		if(!prog[i].match(/^(?:(?:\/)|(?:[a-z]\:\\))/i)){
		 	prog[i]= os=='WINNT'? path+'\\'+prog[i] : path+'/'+prog[i];
		}
	}
 
	var process = Components.classes['@mozilla.org/process/util;1'].createInstance(Components.interfaces.nsIProcess);
  var pref = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);  
	var protos = ['http','ssl','ftp','socks'];
	var prefs = {
      'network.proxy.type': 0,
 			'network.proxy.http': '',
			'network.proxy.http_port': 0,
			'network.proxy.ssl': '',
			'network.proxy.ssl_port': 0,
			'network.proxy.ftp': '',
			'network.proxy.ftp_port': 0,
			'network.proxy.socks': '',
			'network.proxy.socks_port': 0,
			'network.proxy.socks_version':0,
			'network.proxy.socks_remote_dns':false,
			'network.proxy.no_proxies_on':''	
   };

   var getLogin = function(){
        var login = pwMan.findLogins({},'chrome://hushtunnel@congress.public',null,'SSH User');
        return login && login.length>0 ? [login[0].username,login[0].password] : [];   
   };
   
   var getPref=function(k){
   
      if(k.match(/^extensions\.hushtunnel\.ssh\.(?:(?:username)|(?:password))$/i)){
			  var login = getLogin();
			  if(login && login.length>1){           
				   return k.match(/\.username$/i) ? login[0].replace(/^xxxxx$/,'') : login[1].replace(/^xxxxx$/,'');
				}        
      }
   
			var t = pref.getPrefType(k);
			if(t==32 || t==0){
			  if(k.match(/^extensions\.hushtunnel\.ssh\.(?:(?:username)|(?:password))$/i)){
			     if(!pref.getCharPref('extensions.hushtunnel.ssh.username') || !pref.getCharPref('extensions.hushtunnel.ssh.password')) return '';
			     setPref('extensions.hushtunnel.ssh.username',pref.getCharPref('extensions.hushtunnel.ssh.username'));
			     setPref('extensions.hushtunnel.ssh.password',pref.getCharPref('extensions.hushtunnel.ssh.password'));
			     pref.setCharPref('extensions.hushtunnel.ssh.username','');
			     pref.setCharPref('extensions.hushtunnel.ssh.password','');
			     return getPref(k);
			  }
				return pref.getCharPref(k);	
			}else if(t==64){
			  return pref.getIntPref(k);
			}else if(t==128){
			  return pref.getBoolPref(k);
			}
			return '';
   };
   
   var setPref=function(k,v){   
      if(k.match(/^extensions\.hushtunnel\.ssh\.(?:(?:username)|(?:password))$/i)){
			  var login = getLogin();
			  if(!login || login.length<2){ 			      
				    pwMan.addLogin(k.match(/\.username$/i) ? new nsLogin('chrome://hushtunnel@congress.public',null,'SSH User',v,'xxxxx','','') : new nsLogin('chrome://hushtunnel@congress.public',null,'SSH User','xxxxx',v,'',''));  
						return;
				}   				
				pwMan.modifyLogin( new nsLogin('chrome://hushtunnel@congress.public',null,'SSH User',login[0],login[1],'',''), k.match(/\.username$/i) ? new nsLogin('chrome://hushtunnel@congress.public',null,'SSH User',v,login[1],'','') : new nsLogin('chrome://hushtunnel@congress.public',null,'SSH User',login[0],v,'',''));				
				return;        
      }   
      
			var t = pref.getPrefType(k);
			if(t==32 || t==0){
				pref.setCharPref(k,v);	
			}else if(t==64){
			  pref.setIntPref(k,v);
			}else if(t==128){
			  pref.setBoolPref(k,v);
			}   
  };   
  
  this.Test = function(){ 
    if(blocking) return;
    blocking = true;
    
  	this.Save(true);	  	
  	onPrefs();
  	document.getElementById('test').className ='loading';
  	ssh();
  	checkssh(true);
  	offPrefs();
  };
   
  this.Load = function(){
  	var port = parseInt(getPref('extensions.hushtunnel.ssh.port'),10);
  	document.getElementById('server').value = port==22 || !port ? getPref('extensions.hushtunnel.ssh.ip') : getPref('extensions.hushtunnel.ssh.ip')+':'+port;
		document.getElementById('user').value = getPref('extensions.hushtunnel.ssh.username');
		document.getElementById('pass').value = getPref('extensions.hushtunnel.ssh.password');		
	}; 
  this.Save = function(test){
		var port=22;
		winreg = false;
		var server = document.getElementById('server').value.replace(/^(?:\s+)|(?:\s+)$/g,'');
		if(server.match(/\:[0-9]+$/)) {
			port=parseInt(server.replace(/^.*\:/g,''),10);
			server=server.replace(/\:[0-9]+$/g,'');
		}
	
		var user = document.getElementById('user').value.replace(/^(?:\s+)|(?:\s+)$/g,'');
		var pass = document.getElementById('pass').value.replace(/^(?:\s+)|(?:\s+)$/g,'');	
		if(user.length>0){
			setPref('extensions.hushtunnel.ssh.username',user);
		}
		if(pass.length>0){
			setPref('extensions.hushtunnel.ssh.password',pass);
		}

		if(server.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) || server.match(/\.[a-z]/i)){
    	setPref('extensions.hushtunnel.ssh.ip',server);			
		}
		if(port>0){
			setPref('extensions.hushtunnel.ssh.port',port);
		}
		if(!test){	
			document.getElementById('server').value='';
			document.getElementById('user').value='';
			document.getElementById('pass').value='';
		}	
	};	

	this.Toggle = function(e){

		if(blocking) return;
	  blocking = true;
	                      
		var o=document.getElementById('hushtunnel-panel');		
		if(e && e.button==2){
			e.preventDefault();
			e.stopPropagation();
			document.getElementById('test').className = 'none';
			document.getElementById('settings').openPopup(o, 'before_end', 0, 0, false, false);
			blocking = false;			
			return false;
		}
				
		if(on){
			on = false;							
			o.className='lock_off';
			offPrefs();
			killProcess(); 
			blocking = false;
		}else{			
			on = true;
			o.className='lock_wait';
			onPrefs();               
			ssh();		
		}		
	};
	var checkssh=function(test,tm){
	  if(!tm)tm=7000;
		test ? window.setTimeout(function(){document.getElementById('test').className = process.isRunning ? 'check' : 'x';	killProcess(); blocking = false; },tm) : window.setTimeout(function(){blocking = false;if(!process.isRunning){on = true;HUSHTUNNEL.Toggle();}else{if(document.getElementById('hushtunnel-panel').className=='lock_wait')document.getElementById('hushtunnel-panel').className='lock_on';checkssh(false,60)}},tm);
	};

	var onPrefs = function(){
			for(var i in prefs){
				prefs[i]=getPref(i);
			}			
			setPref('network.proxy.type',1);
			for(var i in protos){
				setPref('network.proxy.'+protos[i],getPref('extensions.hushtunnel.network.proxy.ip'));
				setPref('network.proxy.'+protos[i]+'_port',getPref('extensions.hushtunnel.network.proxy.port'));
			}				
			setPref('network.proxy.socks_version',5);
			setPref('network.proxy.socks_remote_dns',true);
      setPref('network.proxy.no_proxies_on',getPref('extensions.hushtunnel.network.proxy.no_proxies_on'));
			prog['USER'] = getPref('extensions.hushtunnel.ssh.prog');	
	};
	var offPrefs = function(){
			for(var i in prefs){
				setPref(i,prefs[i]);
			}	
	};
	
	var killProcess = function(){
		if(!pInit || !process.isRunning) return;
		if(prog['USER']){
		  process.kill();
		}else if(os=='WINNT' && process.pid){
			var pid = process.pid;
			process.kill();  			
			runProcess(prog[os],[pid],true);	
		}else{
		  process.kill();
		}
	};
	
	var initProcess=function(file){
		if(pInit==true) return;
	  pInit=true;
	  process.init(file);
	};
	
	var runProcess = function(pg,args,blk){
		killProcess();		
		file.initWithPath(pg);		
		if(!file.exists()){ 
			if(os=='DARWIN' || os=='LINUX'){
				pg=prog[os]=prog[os].replace(/\/usr\/bin/i,'/usr/local/bin');
			  file.initWithPath(pg);
			}
			if(!file.exists()) return false;
		}	
		initProcess(file);
		process.run(blk,args,args.length);
		
		return true;
	};
		
	var ssh = function(){
						
		var port = parseInt(getPref('extensions.hushtunnel.ssh.port'),10);
  	var server = getPref('extensions.hushtunnel.ssh.ip');
  	var user = getPref('extensions.hushtunnel.ssh.username');
		var pass = getPref('extensions.hushtunnel.ssh.password');
		var proxy = getPref('extensions.hushtunnel.network.proxy.ip');
		var proxyPort = getPref('extensions.hushtunnel.network.proxy.port');
		
		if(user.length<1 || pass.length<1 || (!server.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/) && !server.match(/\.[a-z]/i)) ){
			checkssh();
			return false;
		}
				
		if(prog['USER']){
			runProcess(prog['USER'],[],false);
		}else if(os=='WINNT'){							
			if(!winreg && reg){
				var hostkey = new RegExp('@(?:'+port+'\:)?'+server+'$');						
				var hostkeyanyport = new RegExp('@(?:[0-9]+\:)?'+server+'$');
				reg.open(reg.ROOT_KEY_CURRENT_USER,'SOFTWARE',reg.ACCESS_ALL);
				var key = reg.createChild('SimonTatham',reg.ACCESS_ALL);
				key = key.createChild('PuTTY',reg.ACCESS_ALL);
				key = key.createChild('SshHostKeys',reg.ACCESS_ALL);
				for (var i=0; i<key.valueCount; i++) {
  				if(key.getValueName(i).match(hostkey)){
  					winreg = true;
  					break;
  				}
				}
				for (var i=0; i<key.valueCount; i++) {
  				if(key.getValueName(i).match(hostkeyanyport)){
  					winreg = true;
  					break;
  				}
				}				
				key.close();
				reg.close();
			} 			  
      if(!winreg){
      		runProcess(prog[os],[path+'\\'+'tunnel.bat','test',proxyPort+':'+proxy+':'+proxyPort,user+'@'+server+':'+port],true);		
			}	
			runProcess(prog[os],['plink.exe','-batch','-ssh','-pw',pass,'-C','-A','-N','-L',proxyPort+':'+proxy+':'+proxyPort,user+'@'+server+':'+port],false);													
		}else {			
			runProcess(prog[os],[path+'/'+'ssh.pl',pass,'-q','-T','-f','-N','-n','-o','StrictHostKeyChecking=no','-p',port,'-L',proxyPort+':'+proxy+':'+proxyPort,user+'@'+server],false);	
		}
		
		checkssh();
		
	};

	var ExitObserver = {
  	observe: function(subject, topic, data){
    	if (topic == 'quit-application-requested') {
				if(on) HUSHTUNNEL.Toggle();		
    	}
  	},
  	register: function() {
  	  var obs = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
    	obs.addObserver(this, 'quit-application-requested', false);
   	},
  	unregister: function() {
  	  var obs = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
    	obs.removeObserver(this, 'quit-application-requested');
  	}
	};	
	ExitObserver.register();	

};				
