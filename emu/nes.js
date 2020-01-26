var nes = (function() {
	var me = this;
	me.ppu = new ppu(me);
	me.mmu = new mmu(me);
	me.cpu = new cpu(me);
	me.apu = null;
	me.dbg = new dbg(me);										// DEBUGGER

	me.p1ks = 0x00;												// BOTOES APERTADOS (PLAYER 1)
	me.p2ks = 0x00;												// BOTOES APERTADOS (PLAYER 2)
	me.ktrg = 0x00;												// TRIGGER DE ESCRITA EM $4016, $4017

	me.loadrom = (arr) => me.mmu.load(arr);

	me.step = () => {
		me.dbg.step();
		me.cpu.step();
		me.ppu.step();
		me.ppu.step();
		me.ppu.step();
		if(me.apu) me.apu.step();
		if(me.ktrg & 0x01) me.mmu.ctrl(0, me.p1ks);
		if(me.ktrg & 0x02) me.mmu.ctrl(1, me.p2ks);
	};

	me.createapu = (s) => me.apu = new apu(me, s);

	me.frame = () => {
		while(!me.ppu.rd) me.step();
		me.ppu.rd = false;
	};
});
