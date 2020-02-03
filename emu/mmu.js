var mmu = (function(nes) {
	var me = this;
	var ne = nes;

	me.dbg = (x) => { return { ram: ram.slice(x, x + 0xF) }; };		// DEBUG

	var mp = null;													// MAPPER
	var ram = new Uint8Array(0x8000);

	me.load = (rom) => {											// CARREGAR ROM
		var mapr = (rom[7] & 0xF0) | (rom[6] >> 4);
		ne.ppu.mir = rom[6] & 1;
		switch(mapr) {
			case 0: mp = new mpr0(ne); break;
			case 1: mp = new mpr1(ne); break;
			case 2:case 66: mp = new mpr2(ne); break;
			default: console.log("mapper " + mapr); break;
		};
		mp.load(rom);
	};

	me.rb = (a) => {
		var dec = d(a);
		if(dec >= 0x2000 && dec < 0x2008) return ne.ppu.rb(dec);
		if(dec >= 0x4000 && dec < 0x4014) return ne.apu.rb(dec);
		if(dec === 0x4014) return ne.ppu.rb(dec);
		if(dec === 0x4015) return ne.apu.rb(dec);
		if(dec === 0x4016) {
			ne.ktrg &= 0xFE;
			var v = ram[dec] & 0x01;
			ram[dec] >>= 0x01;
			return v;
		};
		if(dec === 0x4017) return ne.apu.rb(dec);
		if(dec >= 0x8000) return mp.rb(dec);
		return ram[dec];
	};
	
	me.wb = (a, v) => {
		var dec = d(a);
		if(dec >= 0x2000 && dec < 0x2008) return ne.ppu.wb(dec, v);
		if(dec >= 0x4000 && dec < 0x4014) return ne.apu.wb(dec, v);
		if(dec === 0x4014) return ne.ppu.wb(dec, v);
		if(dec === 0x4015) return ne.apu.wb(dec, v);
		if(dec === 0x4016) return ne.ktrg |= 0x01;
		if(dec === 0x4017) return ne.apu.wb(dec, v);
		if(dec >= 0x8000) return mp.wb(dec, v);
		return (ram[dec] = v);
	};

	me.wbp = (a, v) => ram[a] = v;
	me.rbp = (a) => ram[a];

	me.ctrl = (x, v) => ram[0x4016 + x] = v;

	var d = (a) => {											// DECODE ENDERECO
		if(a < 0x0800) return a;
		if(a < 0x2000) return a % 0x0800;
		if(a < 0x2008) return a;
		if(a < 0x4000) return 0x2000 | (a % 0x8);
		return mp.d(a);
	};

});
