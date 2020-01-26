var apu = (function(nes, s) {
	var me = this;
	var ne = nes;
	var ch = [];
	var r = new Uint8Array(0x18);
	me.fc = 0;
	me.tf = 0;

	me.bufs = [
		{ buf: new Array(s), rd: true },
		{ buf: new Array(s), rd: true },
		{ buf: new Array(s), rd: true },
		{ buf: new Array(s), rd: true },
		{ buf: new Array(s), rd: true }
	];

	me.rb = (a) => r[a & 0x1F];
	me.wb = (a, v) => {
		var d = a & 0x1F;
		r[d] = v;
		for(let c = 0; c < ch.length; c++) ch[c].wb(d, v);
	};

	me.step = () => {
		if(s === 0) return;
		var sc = ne.cpu.sc;
		var ss = r[0x17] & 0x80;
		for(let i = 0; i < sc; i++) {
			me.fc += 0.5;
			if(ss)
				if(me.fc >= 18641) me.fc = 0;
			else
				if(me.fc >= 14915) me.fc = 0;

			for(let c = 0; c < ch.length; c++) ch[c].step(r, ss);
		};
	};
	
	me.rst = () => {
		for(let c = 0; c < ch.length; c++) {
			let cv = ch[c].gv();
			let len = me.bufs[c].buf.length;
			let nb = ch[c].rst();
			me.bufs[c].rd = nb.length === 0;
			me.bufs[c].gn = cv.gn * 0.0125;
			let cl = nb.length;
			for(let p = 0; p < cl; p++) me.bufs[c].buf[(len + p) % len] = nb[p];
		};

		me.tf = 0;
		return me.bufs;
	};

	me.gc = (c) => ch[c];
	
	me.mt = (c, v) => ch[c].mt = v;

	(() => {
		ch[0] = new chn(this, s, [0x00, 0x01, 0x02, 0x03]);
		ch[1] = new chn(this, s, [0x04, 0x05, 0x06, 0x07]);
		ch[2] = new chn(this, s, [0x08, 0x09, 0x0A, 0x0B]);
		ch[3] = new chn(this, s, [0x0C, 0x0D, 0x0E, 0x0F]);
		//me.mt(0, 1);
		//me.mt(1, 1);
		//me.mt(2, 1);
	})();
});

var ltb = [
	10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
	12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
];

var chn = (function(a, s, ra) {
	var me = this;
	var fc = 0;								// QUANTAS VEZES RODOU NO FRAME
	var ms = { m: 0, s: 0 };				// CALCULO DE SAMPLES POR FRAME E SUBFRAME
	var p = { x: 0, y: 0 };					// PONTEIRO HORIZONTAL (POS BUFFER) E VERTICAL (VOLUME)
	var e = { c: 0, d: 0 };					// ENVELOPE. C = CURRENT, D = DECAY
	var l = { f: 0, v: 0 };					// LENGTH. F = START FLAG
	var t = { v: 0, c: 0, d: 0, dc: 0 };	// TIMER. V = VALOR, C = CURRENT, D = DUTY, DC = DUTY CURRENT
	var sw = { s: 0, n: 0, e: 0, p: 0, c: 0 };// SWEEP E = ENABLED, P = PERIODO, S = QTD, N = NEGATE
	var fc = { c: 0, f: 0 };
	var ev = [];
	me.mt = 0;

	me.gv = () => { return { gn: e.c }; };

	me.wb = (a, v) => {
		if(a === 0x09) return;
		if(a === ra[0]) {
			e.c = v & 0x0F;
			t.d = (v & 0xC0) >> 6;
		}
		else if(a === ra[1]) {
			sw.n = (v & 0x08) >> 3;
			sw.e = (v & 0x80) >> 7;
			sw.p = (v & 0x70) >> 4;
			sw.s = v & 0x07;
		}
		else if(a === ra[2]) {
			let ov = t.v & 0xFF;
			t.v &= 0x700;
			t.v |= v;

			if(l.v > 0 && ov != v) l.f = 1;
		}
		else if(a === ra[3]) {
			l.f = 1;
			t.v &= 0xFF;
			t.v = ((v & 0x07) << 8) | t.v;
			l.v = ltb[(v >> 3)];
			if(l.v === 0) e.c = 0;
		};
	};

	me.step = (r, st) => {					// PASSO DA APU
		fc.c++;
	};

	var wav = () => {				// PASSO DA ONDA
		return;
		if(ms.m === 0) return;
		if(ms.s < ms.m) { ms.s += (ra[0] === 0x08 ? 4 : 2); return; }
		ms.s -= ms.m;
		buf[p.x++] = me.mt ? 0 : p.y;
		if(p.x < buf.length) return;
		p.x = 0;
	};

	me.rst = () => {				// REINICIAR FRAME	
		if(l.f === 0) { fc.c = 0; return []; }
		l.f = 0;
		if(me.mt) return [];
		let buf = null;
		switch(ra[0]) {
			case 0x08: buf = tri(); break;
			case 0x0C: buf = noi(); break;
			default: buf = pulse(); break;
		};

		ev.length = 0;
		fc.c = 0;
		fc.f = 0;
		return buf;
	};

	var pulse = () => {
		let buf = new Array(s);
		let fr = (s / 60) / 2;
			
		for(let i = 0; i < buf.length; i++) {
			// SWEEP
			if(sw.e === 1 && (i % fr) === 0) {
				sw.c += 1;
				if(sw.c > sw.p) {
					sw.c = 0;
					if(sw.n === 1) t.v += sw.s;
					else t.v -= sw.s;

					if(t.v > 0x7FF) t.v = 0x7FF;
					if(t.v < 0) t.v = 0;

					t.v &= 0x07FF;
				};
			};

			t.c += 5;
			if(t.c >= t.v) {
				p.y = p.y === 0 ? 0.2 : 0;
				t.dc ^= 1;
				t.c -= t.v;
			};
			buf[i] = p.y;
		};
		return buf;
	};

	var tri = () => {
		let buf = new Array(s);
		let fr = (s / 60) / 2;
		for(let i = 0; i < buf.length; i++) {
			t.c += 40;
			if(t.c >= t.v) {
				p.y += (t.dc === 1 ? 0.0125 : -0.0125);
				t.c -= t.v;
				if(p.y >= 0.2) {
					t.dc ^= 1;
					p.y = 0.2;
				};
				if(p.y <= 0) {
					t.dc ^= 1;
					p.y = 0;
				};
			};
			buf[i] = p.y;
		};
		return buf;
	};

	var noi = () => {
		let llc = 0;
		let buf = new Array(s);
		let fr = ((s / 60) / 2) | 0;
		for(let i = 0; i < buf.length; i++) {
			if((i % fr) === 0) llc++;
			if(llc >= l.v) {
				buf[i] = 0;
				continue;
			}
			p.y = Math.random() * 0.2;
			buf[i] = p.y;
		};
		return buf;
	};
});
