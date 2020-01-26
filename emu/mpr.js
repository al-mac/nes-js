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

