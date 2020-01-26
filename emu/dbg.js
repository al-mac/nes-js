var dbg = (function(nes) {
	var me = this;
	var ne = nes;
	var ops = [];
	me.des = 1;									// DESATIVADO
	me.brk = false;

	var brk = { pc: 0, qdsm: 0, a: 0 };
	
	me.step = () => {
		var dbg = n.cpu.dbg();
		var dbgpc = (dbg.r[5] << 8) | dbg.r[6];
		if(dbgpc === brk.pc && !brk.a) { brk.a = 1; };
		if(!brk.a) return;
		if(brk.qdsm <= 0) return;
		brk.qdsm--;
		var m = { pc: h(dbgpc, 4), 
			v0: ne.mmu.rb(dbgpc), 
			v1: ne.mmu.rb(dbgpc + 1), 
			v2: ne.mmu.rb(dbgpc + 2)
		};
		var op = findop(m);
		var dasm = parse(op, m);
		console.log(dasm);
	};

	var findop = (m) => {
		var d = null;
		for(var i = 0; i < ops.length; i++) {
			if(ops[i].opco !== m.v0) continue;
			d = ops[i];
			break;
		};
		return d;
	};

	var parse = (d, m) => {
		if(d === null)
			return m.pc + "		??? (" + h(m.v0) + " " + h(m.v1) + " " + h(m.v2) + ")";

		var ret = m.pc + "            " + d.mneu + " ";
		if(d.addr === "ACC") ret += "A";
		else if(d.addr === "ZP") ret += "$" + h(m.v1);
		else if(d.addr === "REL") ret += "$" + h(m.v1);
		else if(d.addr === "ZPX") ret += "$" + h(m.v1) + ",X";
		else if(d.addr === "ZPY") ret += "$" + h(m.v1) + ",Y";
		else if(d.addr === "ABS") ret += "$" + h(m.v2) + h(m.v1);
		else if(d.addr === "JMP") ret += "$" + h(m.v2) + h(m.v1);
		else if(d.addr === "JSR") ret += "$" + h(m.v2) + h(m.v1);
		else if(d.addr === "IND") ret += "$" + h(m.v2) + h(m.v1);
		else if(d.addr === "ABSJ") ret += "$" + h(m.v2) + h(m.v1);
		else if(d.addr === "ABX") ret += "$" + h(m.v2) + h(m.v1) + ",X";
		else if(d.addr === "ABY") ret += "$" + h(m.v2) + h(m.v1) + ",Y";
		else if(d.addr === "IMM") ret += "#$" + h(m.v1);
		else if(d.addr === "INDX") ret += "($" + h(m.v1) + ",X)";
		else if(d.addr === "INDY") ret += "($" + h(m.v1) + "),Y";

		return ret;
	};

	var h = (x, q) => x == null ? "" : x.toString(16).padStart(q ? q : 2, "0").toUpperCase();

	var load = () => {
		for(var i = 0; i < _OPCODES.length; i++) {
			var linha = _OPCODES[i];
			var partes = linha.split(";");
			ops.push({
				opco: parseInt(partes[0]),
				mneu: partes[1],
				addr: partes[2],
				leng: parseInt(partes[3]),
				type: partes[5]
			});
		};
	};

	me.print = () => {
		console.log("X: " + (ne.ppu.tc % 341) + ", Y: " + ((ne.ppu.tc / 341) | 0));
		console.log("RY: " + h(ne.cpu.dbg().r[0]));
	};

	
	// CONSTRUTOR
	(() => load())();
});

var _OPCODES = [
	"42;ROL;ACC;1;2;N Z C;R",
	"38;ROL;ZP;2;5;N Z C;RMW",
	"54;ROL;ZPX;2;6;N Z C;RMW",
	"46;ROL;ABS;3;6;N Z C;RMW",
	"62;ROL;ABX;3;7;N Z C;RMW",
	"106;ROR;ACC;1;2;N Z C;R",
	"102;ROR;ZP;2;5;N Z C;RMW",
	"118;ROR;ZPX;2;6;N Z C;RMW",
	"110;ROR;ABS;3;6;N Z C;RMW",
	"126;ROR;ABX;3;7;N Z C;RMW",
	"41;AND;IMM;2;2;N Z;R",
	"37;AND;ZP;2;3;N Z;R",
	"53;AND;ZPX;2;4;N Z;R",
	"45;AND;ABS;3;4;N Z;R",
	"61;AND;ABX;3;4+;N Z;R",
	"57;AND;ABY;3;4+;N Z;R",
	"33;AND;INDX;2;6;N Z;R",
	"49;AND;INDY;2;5+;N Z;R",
	"9;ORA;IMM;2;2;N Z;R",
	"5;ORA;ZP;2;3;N Z;R",
	"21;ORA;ZPX;2;4;N Z;R",
	"13;ORA;ABS;3;4;N Z;R",
	"29;ORA;ABX;3;4+;N Z;R",
	"25;ORA;ABY;3;4+;N Z;R",
	"1;ORA;INDX;2;6;N Z;R",
	"17;ORA;INDY;2;5+;N Z;R",
	"73;EOR;IMM;2;2;N Z;R",
	"69;EOR;ZP;2;3;N Z;R",
	"85;EOR;ZPX;2;4;N Z;R",
	"77;EOR;ABS;3;4;N Z;R",
	"93;EOR;ABX;3;4+;N Z;R",
	"89;EOR;ABY;3;4+;N Z;R",
	"65;EOR;INDX;2;6;N Z;R",
	"81;EOR;INDY;2;5+;N Z;R",
	"201;CMP;IMM;2;2;N Z C;R",
	"197;CMP;ZP;2;3;N Z C;R",
	"213;CMP;ZPX;2;4;N Z C;R",
	"205;CMP;ABS;3;4;N Z C;R",
	"221;CMP;ABX;3;4+;N Z C;R",
	"217;CMP;ABY;3;4+;N Z C;R",
	"193;CMP;INDX;2;6;N Z C;R",
	"209;CMP;INDY;2;5+;N Z C;R",
	"233;SBC;IMM;2;2;N V Z C;R",
	"229;SBC;ZP;2;3;N V Z C;R",
	"245;SBC;ZPX;2;4;N V Z C;R",
	"237;SBC;ABS;3;4;N V Z C;R",
	"253;SBC;ABX;3;4+;N V Z C;R",
	"249;SBC;ABY;3;4+;N V Z C;R",
	"225;SBC;INDX;2;6;N V Z C;R",
	"241;SBC;INDY;2;5+;N V Z C;R",
	"105;ADC;IMM;2;2;N V Z C;R",
	"101;ADC;ZP;2;3;N V Z C;R",
	"117;ADC;ZPX;2;4;N V Z C;R",
	"109;ADC;ABS;3;4;N V Z C;R",
	"125;ADC;ABX;3;4+;N V Z C;R",
	"121;ADC;ABY;3;4+;N V Z C;R",
	"97;ADC;INDX;2;6;N V Z C;R",
	"113;ADC;INDY;2;5+;N V Z C;R",
	"169;LDA;IMM;2;2;N Z;R",
	"165;LDA;ZP;2;3;N Z;R",
	"181;LDA;ZPX;2;4;N Z;R",
	"173;LDA;ABS;3;4;N Z;R",
	"189;LDA;ABX;3;4+;N Z;R",
	"185;LDA;ABY;3;4+;N Z;R",
	"161;LDA;INDX;2;6;N Z;R",
	"177;LDA;INDY;2;5+;N Z;R",
	"133;STA;ZP;2;3;;W",
	"149;STA;ZPX;2;4;;W",
	"141;STA;ABS;3;4;;W",
	"157;STA;ABX;3;5;;W",
	"153;STA;ABY;3;5;;W",
	"129;STA;INDX;2;6;;W",
	"145;STA;INDY;2;6;;W",
	"134;STX;ZP;2;3;;W",
	"150;STX;ZPY;2;4;;W",
	"142;STX;ABS;3;4;;W",
	"132;STY;ZP;2;3;;W",
	"148;STY;ZPX;2;4;;W",
	"140;STY;ABS;3;4;;W",
	"162;LDX;IMM;2;2;N Z;R",
	"166;LDX;ZP;2;3;N Z;R",
	"182;LDX;ZPY;2;4;N Z;R",
	"174;LDX;ABS;3;4;N Z;R",
	"190;LDX;ABY;3;4+;N Z;R",
	"160;LDY;IMM;2;2;N Z;R",
	"164;LDY;ZP;2;3;N Z;R",
	"180;LDY;ZPX;2;4;N Z;R",
	"172;LDY;ABS;3;4;N Z;R",
	"188;LDY;ABX;3;4+;N Z;R",
	"230;INC;ZP;2;5;N Z;RMW",
	"246;INC;ZPX;2;6;N Z;RMW",
	"238;INC;ABS;3;6;N Z;RMW",
	"254;INC;ABX;3;7;N Z;RMW",
	"198;DEC;ZP;2;5;N Z;RMW",
	"214;DEC;ZPX;2;6;N Z;RMW",
	"206;DEC;ABS;3;6;N Z;RMW",
	"222;DEC;ABX;3;7;N Z;RMW",
	"10;ASL;ACC;1;2;N Z C;R",
	"6;ASL;ZP;2;5;N Z C;RMW",
	"22;ASL;ZPX;2;6;N Z C;RMW",
	"14;ASL;ABS;3;6;N Z C;RMW",
	"30;ASL;ABX;3;7;N Z C;RMW",
	"74;LSR;ACC;1;2;N Z C;R",
	"70;LSR;ZP;2;5;N Z C;RMW",
	"86;LSR;ZPX;2;6;N Z C;RMW",
	"78;LSR;ABS;3;6;N Z C;RMW",
	"94;LSR;ABX;3;7;N Z C;RMW",
	"224;CPX;IMM;2;2;N Z C;R",
	"228;CPX;ZP;2;3;N Z C;R",
	"236;CPX;ABS;3;4;N Z C;R",
	"192;CPY;IMM;2;2;N Z C;R",
	"196;CPY;ZP;2;3;N Z C;R",
	"204;CPY;ABS;3;4;N Z C;R",
	"24;CLC;IMP;1;2;C;A",
	"56;SEC;IMP;1;2;C;A",
	"88;CLI;IMP;1;2;I;A",
	"120;SEI;IMP;1;2;I;A",
	"184;CLV;IMP;1;2;V;A",
	"216;CLD;IMP;1;2;D;A",
	"248;SED;IMP;1;2;D;A",
	"76;JMP;ABSJ;3;3;;A",
	"108;JMP;IND;3;5;;A",
	"32;JSR;JSR;3;6;;A",
	"234;NOP;IMP;1;2;;A",
	"170;TAX;IMP;1;2;N Z;A",
	"138;TXA;IMP;1;2;N Z;A",
	"202;DEX;IMP;1;2;N Z;A",
	"232;INX;IMP;1;2;N Z;A",
	"168;TAY;IMP;1;2;N Z;A",
	"152;TYA;IMP;1;2;N Z;A",
	"136;DEY;IMP;1;2;N Z;A",
	"200;INY;IMP;1;2;N Z;A",
	"96;RTS;IMP;1;6;;A",
	"64;RTI;IMP;1;6;;A",
	"36;BIT;ZP;2;3;N V Z;R",
	"44;BIT;ABS;3;4;N V Z;R",
	"154;TXS;IMP;1;2;;A",
	"186;TSX;IMP;1;2;N Z;A",
	"72;PHA;IMP;1;3;;A",
	"104;PLA;IMP;1;4;N Z;A",
	"8;PHP;IMP;1;3;;A",
	"40;PLP;IMP;1;4;;A",
	"16;BPL;REL;2;2++;;A",
	"48;BMI;REL;2;2++;;A",
	"80;BVC;REL;2;2++;;A",
	"112;BVS;REL;2;2++;;A",
	"144;BCC;REL;2;2++;;A",
	"176;BCS;REL;2;2++;;A",
	"208;BNE;REL;2;2++;;A",
	"240;BEQ;REL;2;2++;;A",
	"0;BRK;IMP;1;7;B;A",
	"4;NOP;ZP;2;3;;R",
	"20;NOP;ZPX;2;4;;R",
	"52;NOP;ZPX;2;4;;R",
	"68;NOP;ZP;2;3;;R",
	"84;NOP;ZPX;2;4;;R",
	"100;NOP;ZP;2;3;;R",
	"116;NOP;ZPX;2;4;;R",
	"12;NOP;ABS;3;4;;R",
	"212;NOP;ZPX;2;4;;R",
	"244;NOP;ZPX;2;4;;R",
	"26;NOP;IMP;1;2;;A",
	"58;NOP;IMP;1;2;;A",
	"90;NOP;IMP;1;2;;A",
	"122;NOP;IMP;1;2;;A",
	"218;NOP;IMP;1;2;;A",
	"250;NOP;IMP;1;2;;A",
	"128;NOP;IMM;2;2;;R",
	"60;NOP;ABX;3;4+;;R",
	"28;NOP;ABX;3;4+;;R",
	"92;NOP;ABX;3;4+;;R",
	"124;NOP;ABX;3;4+;;R",
	"220;NOP;ABX;3;4+;;R",
	"252;NOP;ABX;3;4+;;R",
	"167;LAX;ZP;2;3;N Z;R",
	"183;LAX;ZPY;2;4;N Z;R",
	"163;LAX;INDX;2;6;N Z;R",
	"179;LAX;INDY;2;5+;N Z;R",
	"175;LAX;ABS;3;4;N Z;R",
	"191;LAX;ABY;3;4+;N Z;R",
	"135;SAX;ZP;2;3;;W",
	"151;SAX;ZPY;2;4;;W",
	"131;SAX;INDX;2;6;;W",
	"143;SAX;ABS;3;4;;W",
	"235;SBC;IMM;2;2;N V Z C;R",
	"199;DCP;ZP;2;5;N Z C;RMW",
	"215;DCP;ZPX;2;6;N Z C;RMW",
	"207;DCP;ABS;3;6;N Z C;RMW",
	"223;DCP;ABX;3;7;N Z C;RMW",
	"219;DCP;ABY;3;7;N Z C;RMW",
	"195;DCP;INDX;2;8;N Z C;RMW",
	"211;DCP;INDY;2;8;N Z C;RMW",
	"231;ISC;ZP;2;5;N V Z C;RMW",
	"247;ISC;ZPX;2;6;N V Z C;RMW",
	"239;ISC;ABS;3;6;N V Z C;RMW",
	"255;ISC;ABX;3;7;N V Z C;RMW",
	"251;ISC;ABY;3;7;N V Z C;RMW",
	"227;ISC;INDX;2;8;N V Z C;RMW",
	"243;ISC;INDY;2;8;N V Z C;RMW",
	"7;SLO;ZP;2;5;N Z C;RMW",
	"23;SLO;ZPX;2;6;N Z C;RMW",
	"15;SLO;ABS;3;6;N Z C;RMW",
	"31;SLO;ABX;3;7;N Z C;RMW",
	"27;SLO;ABY;3;7;N Z C;RMW",
	"3;SLO;INDX;2;8;N Z C;RMW",
	"19;SLO;INDY;2;8;N Z C;RMW",
	"39;RLA;ZP;2;5;N Z C;RMW",
	"55;RLA;ZPX;2;6;N Z C;RMW",
	"47;RLA;ABS;3;6;N Z C;RMW",
	"63;RLA;ABX;3;7;N Z C;RMW",
	"59;RLA;ABY;3;7;N Z C;RMW",
	"35;RLA;INDX;2;8;N Z C;RMW",
	"51;RLA;INDY;2;8;N Z C;RMW",
	"71;SRE;ZP;2;5;N Z C;RMW",
	"87;SRE;ZPX;2;6;N Z C;RMW",
	"79;SRE;ABS;3;6;N Z C;RMW",
	"95;SRE;ABX;3;7;N Z C;RMW",
	"91;SRE;ABY;3;7;N Z C;RMW",
	"67;SRE;INDX;2;8;N Z C;RMW",
	"83;SRE;INDY;2;8;N Z C;RMW",
	"103;RRA;ZP;2;5;N V Z C;RMW",
	"119;RRA;ZPX;2;6;N V Z C;RMW",
	"111;RRA;ABS;3;6;N V Z C;RMW",
	"127;RRA;ABX;3;7;N V Z C;RMW",
	"123;RRA;ABY;3;7;N V Z C;RMW",
	"99;RRA;INDX;2;8;N V Z C;RMW",
	"115;RRA;INDY;2;8;N V Z C;RMW"
];
