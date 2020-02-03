var mpr0 = (function(nes) {
	var me = this;
	var ne = nes;
	var rom = null;
	me.load = (r) => {
		rom = r;
		let pbase = 0x10 + (rom[4] << 0x0E);
		let cbase =  rom[5] << 0x0D;
		for(var i = 0; i < cbase; i++) ne.ppu.wv(i, rom[i + pbase]);
	};
	me.d = (a) => a;
	me.rb = (a) => rom[a + 0x10 - ((rom[4] === 1 && a >= 0xC000) ? 0xC000 : 0x8000)];
	me.wb = (a, v) => (rom[a + 0x10 - ((rom[4] === 1 && a >= 0xC000) ? 0xC000 : 0x8000)] = v);
});

var mpr1 = (function(nes) {
	var me = this;
	var ne = nes;
	var rom = null;
	var pcb = 0x00;				// PRG BANK ATUAL
	var ccbl = 0x00;			// CHR BANK ATUAL LO
	var ccbh = 0x00;			// CHR BANK ATUAL HI

	var vlr = 0x00;				// VALOR SENDO ESCRITO
	var ctr = 0x00;				// CONTROL REGISTER
	var wct = 0x00;				// CONTADOR DE ESCRITAS

	me.load = (r) => {
		rom = r;
		let pbase = 0x10 + (rom[4] << 0x0E);
		let cbase = rom[5] << 0x0D;
		for(let i = 0; i < cbase; i++) ne.ppu.wv(i, rom[i + pbase]);
	};

	var ldchr = () => {
		let pbase = 0x10 + (rom[4] << 0x0E);
		let cbase = rom[5] << 0x0D::Ç:;
		for(let i = 0; i < cbase; i++) ne.ppu.wv(i, rom[i + pbase]);
	};

	me.d = (a) => a;

	me.rb = (a) => {
		//if(a < 0xA000) return ctr;
		//if(a < 0xC000) 
		let dec = 0x10 + (a < 0xC000 ? ((pcb << 0x0E) + (a - 0x8000)) : ((rom[4] << 0x0E) - 0x4000 + (a - 0xC000)));
		return rom[dec];
	};

	me.wb = (a, v) => {
		if(v & 0x80) { wct = 0; vlr = 0; };
		vlr <<= 1;
		vlr |= (v & 0x01);
		wct++;
		if(wct === 5) {
			wct = 0;
			vlr &= 0x1F;
			if(a < 0xA000) ctr = vlr;
			else if(a < 0xC000) { ccbl = vlr; ldchr(); }
			else if(a < 0xE000) { ccbh = vlr; ldchr(); }
			else pcb = vlr;
		};
	};
});


var mpr2 = (function(nes) {
	var me = this;
	var ne = nes;
	var rom = null;
	var cb = 0x00;			// ROM BANK ATUAL
	me.load = (r) => {
		rom = r;
		let pbase = 0x10 + (rom[4] << 0x0E);
		let cbase = rom[5] << 0x0D;
		for(let i = 0; i < cbase; i++) ne.ppu.wv(i, rom[i + pbase]);
	};
	me.d = (a) => a;
	me.rb = (a) => {
		let dec = 0x10 + (a < 0xC000 ? ((cb << 0x0E) + (a - 0x8000)) : ((rom[4] << 0x0E) - 0x4000 + (a - 0xC000)));
		return rom[dec];
	};
	me.wb = (a, v) => {
		let dec = 0x10 + (a < 0xC000 ? ((cb << 0x0E) + (a - 0x8000)) : ((rom[4] << 0x0E) - 0x4000 + (a - 0xC000)));
		if(rom[dec] === (v & 0x07)) cb = v & 0x07;
		return (rom[dec] = v);
	};
});

