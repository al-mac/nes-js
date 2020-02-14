var ppu = (function(nes) {
	var me = this;
	var ne = nes;
	var ptrg = true;													// TRIGGER REFRESH PATTERN TABLES
	me.mir = 0;
	me.spy = false;														// CONTEM SPRITE EM Y (PERFORMANCE)
	var vbuf = 0;														// BUFFER PARA LEITURAS $2007

	me.dbg = () => { return { r: r, ram: ram, oam: oam }; };			// DEBUG

	me.pal = [															// PALETA DE CORES
		0xFF7C7C7C, 0xFFFC0001, 0xFFBC0000, 0xFFBB2844,
		0xFF840093, 0xFF2100A8, 0xFF0011A8, 0xFF011388,
		0xFF013050, 0xFF007801, 0xFF016701, 0xFF015800,
		0xFF594000, 0xFF000000, 0xFF000000, 0xFF000000,
		0xFFBCBCBC, 0xFFF87801, 0xFFF85800, 0xFFFC4468,
		0xFFCD00D8, 0xFF5900E4, 0xFF0138F9, 0xFF105CE4,
		0xFF007CAC, 0xFF00B800, 0xFF00A801, 0xFF43A800,
		0xFF888800, 0xFF020000, 0xFF020000, 0xFF020000,
		0xFFF8F8F8, 0xFFFDBC3C, 0xFFFC8869, 0xFFF97798,
		0xFFF778F9, 0xFF9858F8, 0xFF5878F9, 0xFF459FFD,
		0xFF00B8F8, 0xFF18F8B7, 0xFF55D859, 0xFF98F858,
		0xFFD8E800, 0xFF787878, 0xFF020000, 0xFF020000,
		0xFFFCFCFC, 0xFFFDE4A4, 0xFFF8B8B8, 0xFFF9B8D8,
		0xFFF7B7F8, 0xFFC0A3F8, 0xFFB1D0F1, 0xFFA8E0FD,
		0xFF79D8F9, 0xFF77F9D8, 0xFFB9F9B8, 0xFFD8F7B8,
		0xFFFDFC00, 0xFFF8D8F7, 0xFF020000, 0xFF020000
	];

	me.tc = 0;															// TOTAL DE CICLOS DE PPU
	me.fb = new Array(0xF000);											// FRAMEBUFFER (256 * 240)
	me.rd = false;														// FRAME READY (RENDERIZAR)
	var ram = new Uint8Array(0x4000);									// VRAM
	var oam = new Uint8Array(0x100);									// OAM (SPR-RAM)
	var pts = [[],[]];													// CALCULO PATTERN TABLES
	var nts = [[],[],[],[]];											// CALCULO NAMETABLES
	me.gnts = () => nts;
	me.gpts = () => pts;
	me.tf = 0;

	// REGISTRADORES 
	// 0 = CTRL			1 = MASK		2 = STATUS
	// 3 = OAMADDR		4 = PPUSCROLL_X	5 = PPUSCROLL_Y
	// 6 = PPUADDR_H	7 = PPUADDR_L	8 = OAMDMA
	// 9 = LATCH		10= ODDEVEN
	var r = new Uint8Array(11);
	me.os = 0x00;														// ONE SCREEN MAPPING

	me.rb = (a) => {
		switch(a) {
			case 0x2000: return r[0]; 									// PPUCTRL
			case 0x2001: return r[1];									// PPUMASK
			case 0x2002:												// PPUSTATUS
				r[9] = 0;												// LER $2002
				var v = r[2];											// RESETA A LATCH
				r[2] &= 0x7F;											// E A FLAG VBLANK
				return v;
			case 0x2003: return r[3];									// OAMADDR
			case 0x2004: return oam[r[3]];								// OAMDATA
			case 0x2005: return 0;										// PPUSCROLL
			case 0x2006: return 0;										// PPUADDR
			case 0x2007:
				var v = vbuf;
				var addr = d((r[6] << 8) | r[7]);
				vbuf = ram[addr];										// PPUDATA
				iad();
				return v;
			case 0x4014: return 0;										// OAMDMA
		};
	};

	me.wv = (a, v) => ram[a % 0x4000] = v;								// ESCREVER PRIVATE NA VRAM. APENAS NO LOADROM

	me.wb = (a, v) => {
		switch(a) {
			case 0x2000: return r[0] = v;								// PPUCTRL
			case 0x2001: return r[1] = v;								// PPUMASK
			case 0x2002: return r[2] = v;								// PPUSTATUS
			case 0x2003: return r[3] = v;								// OAMADDR
			case 0x2004: return oam[r[3]++] = v;						// OAMDATA
			case 0x2005: return r[4 + ((r[9]++) & 1)] = v;				// PPUSCROLL
			case 0x2006: {
				if(v === 0)												// ESCREVER 0 LIMPA NAMETABLE
					r[0] &= (r[9] & 0x01) ? 0xFD : 0xFE;
				return r[6 + ((r[9]++) & 1)] = v;						// PPUADDR
			}
			case 0x2007:
				var addr = d((r[6] << 8) | r[7]);
				if(addr < 0x2000) {
					ptrg = true;
					ram[addr] = v;
					iad();
					return;
				};
				ram[addr] = v;											// PPUDATA
				iad();
				return;
			case 0x4014:												// OAMDMA
				var bas = v << 8;
				for(var i = 0; i <= 0xFF; i++)
					oam[i] = ne.mmu.rb(bas | i);
				ne.cpu.tc += 513;
				me.tc += 1539;
				return 0;
		};
	};

	var d = (a) => {
		switch(a) {
			case 0x3F10: case 0x3F14:
			case 0x3F18: case 0x3F1C: 
				return (a & 0xFF0F) % 0x4000;
		};
		return a % 0x4000;
	};

	var iad = () => {													// INC PPUADDR
		var inc = (r[0] & 0x04) === 0 ? 1 : 32;
		while(inc > 0) {
			inc--;
			if(r[7] === 0xFF) {
				r[7] = 0x00;
				r[6]++;
				continue;
			};
			r[7]++;
		};
	};

	var calcpt = (b) => {												// CALCULAR PATTERN TABLES
		pts[b].length = 0;
		var bs = 0x1000 * b;
		for(var t = 0; t < 256; t++) {									// FOR TILE
			var at = [];												// ARRAY TILE
			var bm = bs + (t << 4);										// ENDERECO BASE
			for(var i = 0; i < 8; i++) {
				var lo = ram[bm + i];									// LOW BYTE
				var hi = ram[bm + i + 8];								// HIGH BYTE
				var lt = [];											// LINHA TILE

				for(var x = 7; x >= 0; x--) {
					var fn = (hi & (1 << x)) ? 0x02 : 0x00;				// MONTAR INDICE
					fn |= (lo & (1 << x)) ? 0x01: 0x00;
					lt.push(fn);
				};

				at.push(lt);											// ADICIONAR LINHA AO TILE
			};
			pts[b].push(at);											// ADICIONAR AO ARRAY DE TILES
		};
	};

	var calcnt = (b) => {												// CALCULAR NAMETABLES
		var ba = 0x400 * b;
		var pti = (r[0] & 0x10) >> 4;									// INDICE DA PATTERN TABLE DE BGS
		if(me.os) pti = me.os === 1 ? 0 : 1;
		for(var y = 0; y < 240; y++) {
			var ry = (y / 8) | 0;										// Y TILE
			for(var x = 0; x < 256; x++) {
				var rx = (x / 8) | 0;									// X TILE
				var rt = (ry << 5) + rx;								// OFFSET TILE
				var t = pts[pti][ram[0x2000 + ba + rt]];				// TILE
				var ofs = ((y >> 5) << 3) + (x >> 5); 					// OFFSET PALETA
				var a = ram[0x2000 + ba + 0x03C0 + ofs];				// BYTE INDICE PALETA
				var ms = ((((y >> 4) & 1) << 1) | (x >> 4) & 1) << 1;	// CALCULO POSICAO VS PALETA
				var ap = (a & (0x03 << ms)) >> ms;						// MASCARAR BITS RELEVANTES
				var ti = t[y % 8][x % 8];								// INDICE DO TILE
				var pb = ti === 0 ? ram[0x3F00] : 
					ram[0x3F00 + (ap << 2) + ti];						// UTILIZAR COMO OFFSET NA MEMORIA
				nts[b][(y << 8) + x] = me.pal[pb];						// PREENCHER NAMETABLE COM VALOR DA PALETA
			};
		};
	};

	me.step = () => {
		var spt = (r[0] & 0x08) >> 3;									// SPR PATTERN TABLE
		var sm = r[0] & 0x20;											// SPRITE MODE (8x8 / 8x16)
		var smy = sm ? 16 : 8;
		var trn = me.pal[ram[0x3F00]];
		for(var i = 0; i < ne.cpu.sc; i++) {
			if(me.tc === 89342) {
				me.tc = 0;
				me.tf++;
				if(ptrg) {
					ptrg = false;
					calcpt(0);
					calcpt(1);
				};
				if(me.tf === 8) {										// RECALCULAR NAMETABLES A CADA 8 FRAMES
					calcnt(0);
					calcnt(me.mir ? 1 : 2);
					me.tf = 0;
				};
				continue;
			};

			if(me.tc < 82522) {											// 341 * 242
				if(me.tc === 0) r[2] &= 0x3F;							// ZERAR VBL E SPR
				if(me.tc < 341) {										// PRE-RENDER SCANLINE
					me.tc++;
					continue;
				};
				
				var tc = me.tc - 341;
				var x = tc % 341;										// X ATUAL
				if(x > 0xFF) {											// OVERSCAN X
					me.tc++;
					r[3] = 0;
					continue;
				};

				var y = (tc / 341) | 0x00;								// Y ATUAL
				if(y > 0xF0) {											// OVERSCAN Y
					me.tc++;
					continue;
				};

				// PREENCHER FRAMEBUFFER
				var pos = (y << 8 | x);									// POSICAO DO CANVAS
				var pnt = ((y + r[5]) << 8 | (x + r[4]));				// POSICAO DA NAMETABLE
				var nti = r[0] & 0x03;

				if(x + r[4] > 0xFF) {
					nti ^= 1;
					pnt = (y << 8 | ((x + r[4]) & 0xFF));
				};

				if(y + r[5] >= 240) {
					pnt = ((y + r[5] - 240) << 8 | (x + r[4]) & 0xFF);
				};

				var ntp = nts[nti][pnt];								// NAMETABLE PIXEL
				me.fb[pos] = r[1] & 0x10 ? ntp : trn;					// COR
				me.tc++;

				if(x === 0) {											// VERIFICAR SPRITE NESTE Y
					me.spy = false;
					for(var s = 0; s < oam.length; s += 4) {
						if(y < oam[s] + 1) continue;					// CHECAR TOPO
						if(y > oam[s] + smy) continue;					// CHECAR BAIXO
						me.spy = true;
						break;
					};
				};

				if(!me.spy) continue;									// SE NAO TEM SPRITE NESSE Y, IGNORAR ESSA PARTE
				for(var s = 0; s < oam.length; s += 4) {				// SPRITES
					if(oam[s] >= 0xFE) continue;						// VISIVEL
					if(oam[s] === 0x00) continue;
					if(y < oam[s] + 1) continue;						// POSICAO RELEVANTE PARA RENDERIZAR (Y)
					if(y > oam[s] + smy) continue;
					if(x < oam[s + 3]) continue;						// POSICAO RELEVANTE PARA RENDERIZAR (X)
					if(x > oam[s + 3] + 7) continue;
					let sy = y - oam[s] - 1;							// SPRITE Y
					let sx = x - oam[s + 3];							// SPRITE X
					let ot = (sy > 7 ? 4 : 0);							// OFFSET TILE PARA 8X16
					let tn = oam[s + 1];								// NUMERO DO TILE
					let atr = oam[s + 2];								// ATRIBUTOS
					if(sm) {											// CALCULOS PARA 8X16
						spt = tn & 0x01;								// PATTERN TABLE = BIT 0
						tn &= 0xFE;
						if(ot) {
							sy -= 8;
							if(!(atr & 0x80)) tn++;						// SE FOR PARTE DE BAIXO, TILE = PROXIMO
						}
						else if(atr & 0x80) tn++;
						if(tn > 0xFF) tn = 0;
					};
					if(atr & 0x40) sx = 7 - sx;							// FLIP X
					if(atr & 0x80) sy = 7 - sy;							// FLIP Y
					let t = pts[spt][tn];								// TILE
					

					let px = t[sy][sx];
					if(px === 0) continue;								// SE TRANSPARENTE, NAO RENDERIZAR
					let cl = ram[0x3F10 + ((atr & 0x03) << 2) + px];	// CALCULO DA COR
					if(s === 0 && px > 0) r[2] |= 0x40;					// SPRITE 0 HIT
					if(ntp != trn && atr & 0x20) continue;				// SPRITE ATRAS DO FUNDO
					me.fb[pos] = r[1] & 0x08 ? me.pal[cl] : trn;
					break;
				};

				continue;
			};

			if(me.tc === 82522) {										// VBLANK
				r[2] |= 0x80;
				if(r[0] & 0x80) ne.cpu.nmi = 1;							// TRIGGER NMI
				me.tc++;
				continue;
			};

			if(me.tc === 82523) {										// FRAME READY
				me.rd = true;
				me.tc++;
				continue;
			};

			me.tc++;
		};
	};
});
