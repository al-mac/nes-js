const _b = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
var cpu = (function(nes) {
	var me = this;
	var ne = nes;
	
	me.dbg = () => { return { r: r, o: o }; };																		// DEBUG
	
	var r = new Uint8Array(7);																						// REGISTRADORES. Y,A,X,SP,S,PCH,PCL
	var o = new Uint8Array(8);																						// TEMPS. OPCD,ADL,ADH,OPND,AUX,AUX,ODV,OMD
	var mx = [];																									// MATRIZ DE CICLOS E OPERACOES


	me.nmi = 0;																										// TRIGGER DE INTERRUPT (PPU)
	me.irq = 0;																										// TRIGGER DE INTERRUPT (APU)
	me.tc = 0;																										// CICLOS TOTAL
	me.sc = 0;																										// CICLOS NO STEP

	var d = (x) => x[o[6]] !== "0" && ((_b.indexOf(x[o[6]])) & o[7]) !== 0;											// DECODE

	var ipc = () => {																								// INCREMENTAR PC
		if(r[6] === 0xFF) {
			r[6] = 0x00;
			r[5]++;
			return;
		};
		r[6]++;
	};

	var adsb = (d) => {
		var g = (d ? o[3] : ~o[3]); 
		var a = r[1] + g + (r[4] & 0x01);
		o[4] = ~(r[1] ^ g) & (r[1] ^ a) & 0x80;
		o[4] |= (((a >>> 0) > 0xFF) ? d : !d);
		o[3] = a;
	};
	
	var lgc = () => {																								// LOGICA
		switch(o[0] & 0xE0) {
			case 0x00: o[3] = o[3] | r[1]; break;		// SLO, ORA
			case 0x20: o[3] = o[3] & r[1]; break;		// RLA, AND
			case 0x40: o[3] = o[3] ^ r[1]; break;		// SRE, EOR
		};
		if((o[0] & 0x03) === 0x03) r[1] = o[3];
	};

	var ufo = () => {																								// ATUALIZAR FLAG COM BASE NO OPCODE
		switch(o[0] & 0xC0) {
			case 0x00: r[4] &= 0xFE; r[4] |= (o[0] & 0x20 ? 1 : 0); break;
			case 0x40: r[4] &= 0xFB; r[4] |= (o[0] & 0x20 ? 4 : 0); break;
			case 0x80: r[4] &= 0xBF; break;
			case 0xC0: r[4] &= 0xF7; r[4] |= (o[0] & 0x20 ? 8 : 0); break;
		};
	};

	me.resb = () => {																								// RESET VECTOR
		r[6] = ne.mmu.rb(0xFFFC);
		r[5] = ne.mmu.rb(0xFFFD);
		r[3] = 0xFD;
		r[4] = 0x24;
		//r[6] = 0; // TODO: NESTEST
		me.tc = 7;
	};

	var gix = () => {																								// CALCULAR INDICE COM BASE NO OPCODE
		if((o[0] & 0x07) > 0x05)
			switch(o[0] & 0xF0) {
				case 0x90: case 0xB0: return 0;
			};
		return (o[0] & 0x0F) === 0x09 || (o[0] & 0x0F) === 0x0B ? 0 : 2;
	};
	
	var br = () => {																								// BRANCH
		//me.sc++; // TODO: VER SE ISSO REALMENTE PRECISA.
		switch(o[0] & 0xC0) {
			case 0x00: o[5] = (r[4] & 0x80) > 0 ? 1 : 0; break;
			case 0x40: o[5] = (r[4] & 0x40) > 0 ? 1 : 0; break;
			case 0x80: o[5] = (r[4] & 0x01) > 0 ? 1 : 0; break;
			case 0xC0: o[5] = (r[4] & 0x02) > 0 ? 1 : 0; break;
		};

		if(o[5] === ((o[0] & 0x20) >> 5)) {
			if(o[3] & 0x80) {
				o[3] = 0x80 - (o[3] & 0x7F);
				o[4] = ((r[6] - o[3]) & 0xFF00) >> 8;
				r[6] -= o[3];
			}
			else {
				o[4] = ((r[6] + o[3]) & 0xFF00) >> 8;
				r[6] += o[3];
			};
			me.sc++;

			if(o[4] > 0) {
				r[5] += o[4];
				me.sc++;
			};
		}; 
	};

	me.step = () => {																								// EXECUTAR INSTRUCAO
		o[1] = o[2] = o[3] = o[4] = o[5] = 0x00;																	// RESETAR TEMPS
		me.sc = 0x01;
		o[0] = ne.mmu.rb((r[5] << 8) | r[6]);																		// LER OPCODE
		ipc();

		for(var i = 0; i < mx.length; i++) {
			if(!mx[i][o[0]]) continue;
			mx[i][256]();
		};

		r[4] |= 0x20;
		if(me.nmi) {
			me.nmi = 0;
			ne.mmu.wb(0x100 | r[3]--, r[5]);
			ne.mmu.wb(0x100 | r[3]--, r[6]);
			r[4] |= 0x04;
			ne.mmu.wb(0x100 | r[3]--, r[4]);
			r[5] = ne.mmu.rb(0xFFFB);
			r[6] = ne.mmu.rb(0xFFFA);
			me.sc += 7;
		};

		me.tc += me.sc;																								// SOMAR CICLOS AO TOTAL
	};

	// CONSTRUTOR
	(() => {
		var ops = [
//<++>
			"WA00e02W0A20e02WWA00e02W0A00e02W0A00e02W0A0",(() => { ne.mmu.rb((r[5] << 8) | r[6]); me.sc++; }),   // LEITURA DUMMY, INC PC
			"3myFNuyF3ryF3mzV3myFNmyF3qGF3mzF3myFNmyF3ry",(() => { o[1] = ne.mmu.rb((r[5] << 8) | r[6]); me.sc++; ipc(); }),// LER LB, INC PC
			"00y0Nm0F05y01m1V00y0Nm0F04G03m1F00y0Nm0F05y",(() => { o[2] = ne.mmu.rb((r[5] << 8) | r[6]); me.sc++; ipc(); }),// LER HB, INC PC
			"0000Nm0005y0001V0000Nm0004G0001F0000Nm0005y",(() => { var ix = gix(); o[4] = ((o[1] + r[ix]) >> 8); o[1] += r[ix]; }),// SOMAR IX A LB, INC PC
			"000F00003m0000y0000F00003m0000y0000F00003m0",(() => { o[1] += r[gix()]; me.sc++; }),                // SOMAR IX AO ENDERECO ZP
			"K43G0510q01GGD00K43G0D00m03mGD00q43G0D1Gq00",(() => { o[3] = ne.mmu.rb((r[5] << 8) | r[6]); me.sc++; ipc(); }),// LER IMM, INC PC
			"K0000500001G0000K0000500001G0000K0000500000",(() => { o[3] += r[2]; me.sc++; }),                    // SOMAR X A 3
			"K01G0500K01G0500K01G0500G01G0500K01G0500K00",(() => { o[1] = ne.mmu.rb(o[3]); me.sc++; }),          // 1 = ADDR EM 3
			"K01G0500K01G0500K01G0500G01G0500K01G0500K00",(() => { o[2] = ne.mmu.rb((o[3] + 1) & 0xFF); me.sc++; }),// 2 = ADDR EM 3 + 1
			"001G0000K0000500001G0000G0000500001G0000K00",(() => { o[4] = (o[1] + r[0]) >> 8; o[1] += r[0]; }),  // SOMAR Y A LB
			"001GNm00K5y0051V001GNm00G4G0051F001GNm00K5y",(() => { o[3] = ne.mmu.rb((o[2] << 8) | o[1]); o[2] += o[4];  me.sc++; }),// LEITURA DUMMY, CONSERTAR HI
			"00200000W000080000200000W000080000200000W00",(() => br()),                                          // BRANCHES
			"0200000W00008000020004G4H4G0e00000000000000",(() => o[3] = r[1]),                                   // 3 = A
			"0000000000000000000000gg2g00000W0A000020000",(() => o[3] = r[((o[0] & 0x23) === 0 ? 0 : o[0] === 186 ? 3 : 2)]),// 3 = CALCULO X, Y, S
			"0000080000000000000000000000000000000000000",(() => me.sc++),                                       // CICLO DUMMY
			"W000080000000000000000000000000000000000000",(() => { ne.mmu.wb(0x100 | r[3]--, r[5]); ne.mmu.wb(0x100 | r[3]--, r[6]); me.sc += 2; }),// STACK PUSH PC
			"W800000000000000000000000000000000000000000",(() => { ne.mmu.wb(0x100 | r[3]--, r[4] | 0x10); me.sc++; }),// STACK PUSH P
			"W000000000000000000000000000000000000000000",(() => { ipc(); r[6] = ne.mmu.rb(0xFFFE); r[5] = ne.mmu.rb(0xFFFF); me.sc += 2; }),// BRK
			"0000002000200000W80000000000000000000000000",(() => { r[3]++; me.sc++; }),                          // INCREMENTAR S
			"0000002000200000000000000000000000000000000",(() => { r[4] = ne.mmu.rb(0x100 | r[3]); if(o[0] !== 0x28) r[3]++;  me.sc++; }),// STACK POP P
			"0000000000200000W00000000000000000000000000",(() => { r[6] = ne.mmu.rb(0x100 | r[3]++); r[5] = ne.mmu.rb(0x100 | r[3]);  me.sc += 2; }),// STACK POP PC
			"0000000000000000W00000000000000000000000000",(() => { ipc(); me.sc++; }),                           // INCREMENTAR PC
			"000000000000W000000000000000000000000000000",(() => { ne.mmu.wb(0x100 | r[3]--, r[1]); me.sc++; }), // STACK PUSH A
			"0000000000000000080000000000000000000000000",(() => { o[3] = r[1] = ne.mmu.rb(0x100 | r[3]); me.sc++; }),// STACK POP A
			"0000080000002000000000000000000000000000000",(() => { o[2] = ne.mmu.rb((r[5] << 8) | r[6]); r[6] = o[1]; r[5] = o[2]; me.sc++; }),// BUSCAR 2, COPIAR PC
			"0800002000000000000000000000000000000000000",(() => r[4] &= 0xEF),                                  // RESETAR FLAG B
			"NmyF4ryF3nDV1myJNmyF4m00001V3my0NmyF4ryF3nC",(() => { o[3] = ne.mmu.rb((o[2] << 8) | o[1]); me.sc++; }),// LER DO ENDERECO
			"001GJ000K4m0051C001GJ0000000051F001GJ000K4m",(() => { if(!o[4]) return; o[3] = ne.mmu.rb((o[2] << 8) | o[1]); me.sc++; }),// RE-LER DO ENDERECO
			"000000000000000000W000000000000000000000000",(() => { o[1]++; r[5] = ne.mmu.rb((o[2] << 8) | o[1]); r[6] = o[3]; me.sc++; }),// LATCH JUMP
			"4mCJ4nC34nCJ0nCJ4mCJ4m00000000004mCJ4nC34nC",(() => { ne.mmu.wb((o[2] << 8 | o[1]), o[3]); me.sc++; }),// ESCRITA DUMMY
			"0000000000000000000001410G00000000000000000",(() => o[3] = r[1] & r[2]),                            // SAX
			"000004nCH4G00000000000000000000000000000000",(() => { o[5] = o[3]; o[3] &= r[1]; }),                // BIT OU AND
			"000000000000000000000020000000004wCJ4nE34nC",(() => { o[3] += (o[0] & 0x20 || o[0] === 200 ? 1 : -1); }),// INC OU DEC 3
			"00000000000000000000000000000000000001414H4",(() => { ne.mmu.wb((o[2] << 8) | o[1], o[3]); me.sc++; }),// ESCREVER NO ENDERECO
			"0000000000000000H4H4H00000000000000005LLLLK",(() => adsb(o[0] & 0x80 ? 0 : 1)),                     // ADC OU SBC
			"H4H4H0000014H4H4000000000000000000000000000",(() => lgc()),                                         // LOGICA
			"00000000000000000000000000000000p4n4H8W8000",(() => { r[4] &= 0xFE; r[4] |= (r[(o[0] & 0x20 ? 2 : o[0] & 1)] >= o[3] ? 1 : 0); o[3] = r[(o[0] & 0x20 ? 2 : o[0] & 1)] - o[3]; }),// COMPARAR
			"000000000000000000000000000000004G4H4G00000",(() => { r[4] &= 0xFE; if(r[1] >= o[3]) r[4] |= 0x01; }),// DCP
			"4oCJ4nCZ4nCJ8nCJ4oCJ4m000000000000000000000",(() => o[4] = o[3] & 0x81),                            // GUARDAR BITS QUE VAO SAIR NOS SHIFTS
			"4oCJ4nCZ4nC00000000000000000000000000000000",(() => { o[3] <<= 1; o[4] &= 0x80; o[5] = r[4] & 0x01; }),// SHIFT ESQUERDA 3
			"00000000000J8nCJ4oCJ4m000000000000000000000",(() => { o[3] >>= 1; o[4] &= 0x01; o[5] = (r[4] & 0x01) << 7; }),// SHIFT DIREITA 3
			"000001CZ4nC000004oCJ4m000000000000000000000",(() => o[3] |= o[5]),                                  // OR 3 COM 5
			"H6H4H4HaH4H4P4H4H6H4H00W081LHLL5000005LLLLK",(() => r[1] = o[3]),                                   // A = 3
			"000000000000000000000020022xgnih0A000020000",(() => r[(o[0] & 2) === 2 || o[0] === 232 ? (o[0] === 154 ? 3 : 2) : 0] = o[3]),// Y,S,X = 3
			"4mCJ4nC34nCJ0nCJ4mCJ4ryFJqG000004mCJ4m820W8",(() => { ne.mmu.wb((o[2] << 8) | o[1], o[3]); me.sc++; }),// ESCREVER NO ENDERECO
			"000000000000000000000000000000004G4H4G00000",(() => o[3] = r[1] - o[3]),                            // FIM COMPARACAO
			"LsTNLrzlLrTNPrTNL_TNLm2W083-xrzlt_zNLz-VLrS",(() => { r[4] &= 0xFD; r[4] |= (o[3] === 0 ? 2 : 0); }),// ATUALIZAR FLAG Z
			"000000W800000000000000000000000000000000000",(() => o[3] = o[5]),                                   // RESTAURAR BIT
			"4G4H4H414H4H0H4H000000000000000000000000000",(() => lgc()),                                         // A = LOGICA
			"00000000000000004G4H4G000000000000000000000",(() => { r[4] &= 0xFE; r[4] |= (o[4] & 0x01); adsb(1); r[1] = o[3]; }),// A = RRA
			"LsTNLrzlLrTNPrTNL_TNLm2W083-xrzlt_zNLz-VLrS",(() => { r[4] &= 0x7F; r[4] |= (o[3] & 0x80); }),      // ATUALIZAR FLAG N
			"000000W800000000000000000000000000000000000",(() => { r[4] &= 0xBF; r[4] |= (o[3] & 0x40); }),      // ATUALIZAR FLAG V
			"0000000000000000LKLLLG0000000020000005LLLLK",(() => { r[4] &= 0xBF; r[4] |= ((o[4] & 0x80) >> 1); }),// ATUALIZAR FLAG V
			"4oCJ4nCZ4nC00000000000000000000000000000000",(() => o[4] >>= 7),                                    // CONSERTAR CARRY
			"4oCJ4nCZ4nCJ8nCJLsTNLm0000000000000004HKH4G",(() => { r[4] &= 0xFE; r[4] |= (o[4] & 0x01); }),      // ATUALIZAR CARRY EM 4
			"0000W000080000200000W000000000200000W000080",(() => ufo()),                                         // SET OPCODE FLAG
//<++>
		];
		for(var i = 0; i < ops.length; i += 2) {
			var op = ops[i];
			var rs = [];
			for(var j = 0; j < 256; j++) {
				o[0] = j;
				o[6] = o[0] / 0x06;
				o[7] = 0x20 >> (o[0] % 0x06);
				rs.push(d(op));
			};
			rs.push(ops[i + 1]);
			mx.push(rs);
		};
	})();
});
