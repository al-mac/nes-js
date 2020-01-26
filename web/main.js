var it = 0;	// INTERAGIU
var ui = (function() {
	var me = this;

	// VIDEO
	var scr = document.getElementById("screen");
	var ctx = scr.getContext("2d");
	var imdt = ctx.getImageData(0, 0, 256, 240);
	var buf = new ArrayBuffer(imdt.data.length);
	var b8 = new Uint8ClampedArray(buf);
	var fb = new Uint32Array(buf);
	
	// FPS
	var now;
	var then = performance.now();
	var delta;

	// AUDIO
	var ac = [];

	me.loadrom = (rom) => {
		n.mmu.load(rom);
		n.cpu.resb();
		r = true;
	};

	me.loop = () => {
		window.requestAnimationFrame(u.loop);
		now = performance.now();
		delta = now - then;
		if(delta < 16.6) return;
		then = now - (delta % 16.6);
		if(!r) return;
		n.frame();
		draw();
		audio();		
	};
	
	var draw = () => {
		for(var i = 0; i < n.ppu.fb.length; i++) fb[i] = n.ppu.fb[i];
		imdt.data.set(b8);
		ctx.putImageData(imdt, 0, 0);
		ctx.drawImage(scr, 0, 0, 256, 240, 0, 0, scr.width, scr.height);
	};

	var audio = () => {
		if(!it) return;
		if(ac.length === 0) {
			let sr = 0;
			for(let i = 0; i < 5; i++) {
				let c = { ax: null, ab: null, sc: null, cs: 0, gn: null };
				c.ax = new window.AudioContext();
				if(i === 0) sr = c.ax.sampleRate;
				c.ab = c.ax.createBuffer(1, sr, sr);
				c.sc = c.ax.createBufferSource();
				c.sc.loop = true;
				c.sc.buffer = c.ab;
				c.gn = c.ax.createGain();
				c.sc.connect(c.gn);
				c.gn.connect(c.ax.destination);
				c.sc.start();
				ac[i] = c;
			};

			n.createapu(sr);
		};

		let bufs = n.apu.rst();
		for(let i = 0; i < bufs.length; i++) {
			ac[i].gn.gain.value = bufs[i].gn == null ? 0 : bufs[i].gn;
			let dt = ac[i].ab.getChannelData(0);
			let ax = ac[i].ax;

			let cs = (ax.currentTime * ax.sampleRate) | 0;
			let dta = cs - ac[i].cs;
			ac[i].cs = cs;

			for(let j = 0; j < dta; j++) dt[(cs - j) % ax.sampleRate] = 0;
			if (bufs[i].rd) continue;

			for(let j = 0; j < bufs[i].buf.length; j++) {
				if(dt.length <= j) break;
				dt[((cs + j) % ax.sampleRate)] = bufs[i].buf[j];
			};

			bufs[i].rd = true;
		};
	};

	(() => {
		let factor = scr.parentElement.offsetWidth / scr.offsetWidth;
		scr.width = scr.offsetWidth * factor;
		scr.height = scr.offsetHeight * factor;
	})();
});

var n = new nes(44100);
var u = new ui();
var r = false;
u.loop();


// TECLAS
var kdhandler = (kc) => {
	it = 1;
	switch(kc) {
		case 0x27: n.p1ks |= 0x80; break;	// RIGHT
		case 0x25: n.p1ks |= 0x40; break;	// LEFT
		case 0x28: n.p1ks |= 0x20; break;	// DOWN
		case 0x26: n.p1ks |= 0x10; break;	// UP
		case 0x0D: n.p1ks |= 0x08; break;	// START (ENTER)
		case 0x10: n.p1ks |= 0x04; break;	// SELECT (R-SHIFT)
		case 0x58: n.p1ks |= 0x02; break;	// B (X)
		case 0x5A: n.p1ks |= 0x01; break;	// A (Z)
	};

	uddp();
};

var kuhandler = (kc) => {
	it = 1;
	switch(kc) {
		case 0x27: n.p1ks &= ~0x80; break;	// RIGHT
		case 0x25: n.p1ks &= ~0x40; break;	// LEFT
		case 0x28: n.p1ks &= ~0x20; break;	// DOWN
		case 0x26: n.p1ks &= ~0x10; break;	// UP
		case 0x0D: n.p1ks &= ~0x08; break;	// START (ENTER)
		case 0x10: n.p1ks &= ~0x04; break;	// SELECT (R-SHIFT)
		case 0x58: n.p1ks &= ~0x02; break;	// B (X)
		case 0x5A: n.p1ks &= ~0x01; break;	// A (Z)
	};
	uddp();
};

document.body.onkeydown = (e) => kdhandler(e.keyCode);
document.body.onkeyup = (e) => kuhandler(e.keyCode);
var dragpos = { x: 0, y: 0, xx: 0, yy: 0, touching: false };
document.body.ontouchstart = (e) => {
	let which = e.target.getAttribute("data-which");
	if(which === null) return;
	switch(which) {
		case "load-rom": document.getElementById("loader").click(); break;
		case "start": kdhandler(0x0D);  break;
		case "select": kdhandler(0x10); break;
		case "a": kdhandler(0x5A); break;
		case "b": kdhandler(0x58); break;
		case "dpad": 
			dragpos.x = e.touches[0].clientX; 
			dragpos.y = e.touches[0].clientY;
			dragpos.touching = true;
			break;
	};
};

var ddp = document.querySelector(".dpad > div");

function uddp() {
	if(n.p1ks & 0x80) ddp.style.marginLeft = "30px";
	else if(n.p1ks & 0x40) ddp.style.marginLeft = "-30px";
	else ddp.style.marginLeft = "0px";


	if(n.p1ks & 0x20) ddp.style.marginTop = "30px";
	else if(n.p1ks & 0x10) ddp.style.marginTop = "-30px";
	else ddp.style.marginTop = "0px";

	if(n.p1ks & 0x01) document.querySelector("[data-which=a] > div").style.background = "#800";
	else document.querySelector("[data-which=a] > div").removeAttribute("style");
	if(n.p1ks & 0x02) document.querySelector("[data-which=b] > div").style.background = "#800";
	else document.querySelector("[data-which=b] > div").removeAttribute("style");

	if(n.p1ks & 0x04) document.querySelector("[data-which=select] > div").style.background = "#444";
	else document.querySelector("[data-which=select] > div").removeAttribute("style");
	if(n.p1ks & 0x08) document.querySelector("[data-which=start] > div").style.background = "#444";
	else document.querySelector("[data-which=start] > div").removeAttribute("style");

};

document.body.ontouchmove = (e) => {
	if(!dragpos.touching) return;
	var x = e.touches[0].clientX;
	var y = e.touches[0].clientY;
	dragpos.xx = x;
	dragpos.yy = y;
	if((x - dragpos.x) > 20) { kdhandler(0x27); kuhandler(0x25); }
	else kuhandler(0x27);
	if((x - dragpos.x) < -20) { kdhandler(0x25); kuhandler(0x27); }
	else kuhandler(0x25);
	if((y - dragpos.y) > 20) { kdhandler(0x28); kuhandler(0x26); }
	else kuhandler(0x28);
	if((y - dragpos.y) < -20) { kdhandler(0x26); kuhandler(0x28); }
	else kuhandler(0x26);
};

document.body.ontouchend = (e) => {
	it = 1;
	e.preventDefault();
	let which = e.target.getAttribute("data-which");
	if(which === null) return;
	switch(which) {
		case "start": kuhandler(0x0D);  break;
		case "select": kuhandler(0x10); break;
		case "a": kuhandler(0x5A); break;
		case "b": kuhandler(0x58); break;
		case "dpad":
			dragpos.touching = false;
			kuhandler(0x27);
			kuhandler(0x25);
			kuhandler(0x28);
			kuhandler(0x26);
			break;
	};
};

document.getElementById("loader").onchange = function(e) {
	if(e.target.files.length === 0) return;
	var file = e.target.files[0];
	var r = new FileReader();
	r.onload = function() {
		var rom = new Uint8Array(r.result);
		u.loadrom(rom);
	};
	r.readAsArrayBuffer(file);
};
