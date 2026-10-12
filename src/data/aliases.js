// Curated venue aliases: the names Google Scholar actually prints for venues whose
// official CCF / ICORE title reads differently ("Advances in Neural Information
// Processing Systems" vs "Conference on Neural Information Processing Systems",
// "International Conference on Management of Data" vs "ACM SIGMOD Conference", …).
//
// Each entry points at the dataset rows by abbreviation and lists extra names:
//   ccf / core    abbreviation (CCF `abbr`) / acronym (ICORE) of the target row
//   kind          'C' (default) or 'J' — which CCF index the row lives in
//   ccfTier       disambiguates two CCF rows with the same abbreviation (FSE)
//   coreRank      same for ICORE
//   abbrs         extra abbreviations, for both rows (CCF calls it "SIGKDD", CORE and everyone else "KDD")
//   exact         extra names for whole strings only: the start of a cut-off string is never read as one of them
//                 (a name that is also the start of other venues' names, "Machine Learning and …")
//   noBareAcronym the acronym alone proves nothing: another, unranked venue is called the same ("SAC" is also ACM's Symposium on
//                 Applied Computing) — only the name counts
//   starts        visible starts of a cut-off string that are read as this venue although other venues begin the same way
//                 (the ACL Anthology's "Proceedings of the 23rd International Conference on Computational …" is COLING, not ICCSA);
//                 "annual" and any sponsor the start names (IEEE, ACM, a SIG) are part of the start: the IEEE's "… Conference on
//                 Computational …" is not COLING, and nothing here is a start that only some of the venue's years fit
//   shadow        (an entry of its own, no ccf / core) acronyms of unranked events whose names boil down to the words of a ranked venue's: a string that names one of them
//                 by its acronym — "International Conference on Computer and Communications (ICCC)" is not INFOCOM, "International Congress on Image and Signal
//                 Processing (CISP)" not ICISP, "IEEE Region 10 Symposium (TENSYMP)" not TENCON — gets no badge from either list
//   names         extra names; case, punctuation, ordinals, years and words like
//                 "Proceedings of the" / "International" / "Conference" are ignored
//                 when matching, and ACM/IEEE/USENIX prefixes are optional.
// test/venues.test.js checks that every reference resolves to a real dataset row.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).aliases = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return [
    // ---- machine learning / AI
    { ccf: "NeurIPS", core: "NeurIPS", names: ["Advances in Neural Information Processing Systems", "Neural Information Processing Systems", "NIPS"] },
    { ccf: "AAAI", core: "AAAI", names: ["National Conference on Artificial Intelligence", "AAAI Conference on Artificial Intelligence"] },
    // AAMAS began in 2002 as the merger of the Autonomous Agents conference, ICMAS and ATAL
    { ccf: "AAMAS", core: "AAMAS", names: ["International Conference on Autonomous Agents", "International Conference on Multiagent Systems", "International Conference on Multi-Agent Systems"] },
    { ccf: "IJCAI", core: "IJCAI", names: ["International Joint Conference on Artificial Intelligence"] },
    { ccf: "AISTATS", core: "AISTATS", names: ["International Workshop on Artificial Intelligence and Statistics", "Artificial Intelligence and Statistics"] },
    { ccf: "COLT", core: "COLT", names: ["Conference on Learning Theory", "Annual Conference on Learning Theory", "Computational Learning Theory"] },
    { ccf: "UAI", core: "UAI", names: ["Conference on Uncertainty in Artificial Intelligence", "Uncertainty in Artificial Intelligence"] },
    // ECML (until 2007 its own conference) and PKDD (until 2007) are the two halves of one venue today
    { ccf: "ECML-PKDD", core: "ECML PKDD", abbrs: ["ECML", "PKDD", "ECML PKDD", "ECML-PKDD"], names: ["European Conference on Machine Learning", "European Conference on Principles and Practice of Knowledge Discovery in Databases", "European Conference on Principles of Data Mining and Knowledge Discovery", "Joint European Conference on Machine Learning and Knowledge Discovery in Databases"], exact: ["Machine Learning and Knowledge Discovery in Databases"] },

    // ---- vision
    { ccf: "CVPR", core: "CVPR", names: ["IEEE Conference on Computer Vision and Pattern Recognition", "IEEE/CVF Conference on Computer Vision and Pattern Recognition", "IEEE Computer Society Conference on Computer Vision and Pattern Recognition", "Computer Vision and Pattern Recognition"] },
    { ccf: "ICCV", core: "ICCV", names: ["IEEE International Conference on Computer Vision", "IEEE/CVF International Conference on Computer Vision"] },
    { ccf: "ECCV", core: "ECCV", names: ["European Conference on Computer Vision"] },

    // ---- NLP
    { ccf: "ACL", core: "ACL", names: ["Association for Computational Linguistics", "Annual Meeting of the Association for Computational Linguistics"] },
    { ccf: "EMNLP", core: "EMNLP", names: [
      "Joint SIGDAT Conference on Empirical Methods in Natural Language Processing and Very Large Corpora",
      "Empirical Methods in Natural Language Processing and the International Joint Conference on Natural Language Processing",
      "Joint Conference on Empirical Methods in Natural Language Processing and Computational Natural Language Learning"
    ] },
    { ccf: "NAACL", core: "NAACL", names: [
      "Human Language Technology Conference of the North American Chapter of the Association for Computational Linguistics",
      "North American Chapter of the Association for Computational Linguistics: Human Language Technologies",
      "Human Language Technologies: The Annual Conference of the North American Chapter of the Association for Computational Linguistics"
    ] },
    { ccf: "COLING", core: "COLING", names: ["International Conference on Computational Linguistics"], starts: ["International Conference on Computational"] },
    { core: "EACL", names: ["Conference of the European Chapter of the Association for Computational Linguistics", "European Chapter of the Association for Computational Linguistics"] },
    { ccf: "CoNLL", core: "CoNLL", names: ["Conference on Computational Natural Language Learning", "Computational Natural Language Learning"] },
    { ccf: "INTERSPEECH", core: "Interspeech", names: ["Conference of the International Speech Communication Association", "Annual Conference of the International Speech Communication Association", "Interspeech"] },
    { ccf: "ICASSP", names: ["IEEE International Conference on Acoustics, Speech and Signal Processing"] },

    // ---- data mining / databases / IR
    { ccf: "SIGKDD", core: "KDD", abbrs: ["KDD", "SIGKDD"], names: ["ACM SIGKDD International Conference on Knowledge Discovery and Data Mining", "SIGKDD International Conference on Knowledge Discovery in Data Mining", "Knowledge Discovery and Data Mining"] },
    { ccf: "WWW", core: "WWW", names: ["International Conference on World Wide Web", "International World Wide Web Conference", "World Wide Web Conference", "The Web Conference", "WWW Conference", "ACM Web Conference"] },
    { ccf: "SIGMOD", core: "SIGMOD", names: ["International Conference on Management of Data", "ACM SIGMOD International Conference on Management of Data", "ACM Special Interest Group on Management of Data", "Proceedings of the ACM on Management of Data"] },
    { ccf: "VLDB", core: "VLDB", names: ["Proceedings of the VLDB Endowment", "International Conference on Very Large Data Bases", "VLDB Conference"] },
    { ccf: "WISE", core: "WISE", names: ["International Conference on Web Information Systems Engineering"], starts: ["International Conference on Web Information"] },
    { ccf: "ICDE", core: "ICDE", names: ["IEEE International Conference on Data Engineering", "International Conference on Data Engineering"] },
    { ccf: "WSDM", core: "WSDM", names: ["ACM International Conference on Web Search and Data Mining", "International Conference on Web Search and Data Mining"] },
    { ccf: "CIKM", core: "CIKM", names: ["ACM International Conference on Information and Knowledge Management", "International Conference on Information and Knowledge Management"] },
    { ccf: "SIGIR", core: "SIGIR", names: ["International ACM SIGIR Conference on Research and Development in Information Retrieval", "ACM SIGIR Conference on Research and Development in Information Retrieval"] },
    { ccf: "RecSys", core: "RecSys", names: ["ACM Conference on Recommender Systems"] },

    // ---- graphics
    { ccf: "I3D", names: ["Symposium on Interactive 3D Graphics and Games", "Symposium on Interactive 3D Graphics"] },
    { ccf: "SGP", core: "SGP", names: ["Eurographics/ACM SIGGRAPH Symposium on Geometry Processing", "Eurographics Symposium on Geometry Processing", "Symposium on Geometry Processing"] },
    { ccf: "SCA", core: "SCA", names: ["Eurographics/ACM SIGGRAPH Symposium on Computer Animation", "ACM SIGGRAPH/Eurographics Symposium on Computer Animation", "Symposium on Computer Animation"] },
    // EGSR was the Eurographics Workshop on Rendering; its proceedings are "Rendering Techniques" (the ACM Digital Library: "Eurographics conference on Rendering Techniques")
    { ccf: "EGSR", names: ["Eurographics Workshop on Rendering", "Eurographics Workshop on Rendering Techniques", "Eurographics Conference on Rendering Techniques", "Rendering Techniques"] },
    { core: "SiggraphA", names: ["ACM SIGGRAPH Asia", "SIGGRAPH Asia", "ACM SIGGRAPH Asia Papers", "SIGGRAPH Asia Papers", "ACM SIGGRAPH Asia Technical Papers", "SIGGRAPH Asia Technical Papers"] },

    // ---- HCI
    { ccf: "CHI", core: "CHI", names: ["ACM Conference on Human Factors in Computing Systems", "SIGCHI Conference on Human Factors in Computing Systems", "Conference on Human Factors in Computing Systems", "CHI Conference on Human Factors in Computing Systems"] },
    { ccf: "UIST", core: "UIST", names: ["ACM Symposium on User Interface Software and Technology"] },
    // CCF calls AVI an "International Working Conference", CORE (and ACM) an "International Conference"
    { ccf: "AVI", names: ["International Conference on Advanced Visual Interfaces"] },
    { core: "AVI", names: ["International Working Conference on Advanced Visual Interfaces"] },
    { ccf: "CSCW", core: "CSCW", names: ["ACM Conference on Computer Supported Cooperative Work", "ACM Conference on Computer-Supported Cooperative Work and Social Computing", "Computer Supported Cooperative Work"] },
    // ESWC was the European Semantic Web Conference until 2014; UMAP is spelled "Modeling" by its own publishers (CORE: "Modelling")
    { ccf: "ESWC", core: "ESWC", names: ["European Semantic Web Conference"] },
    // (UM and AH merged into UMAP in 2009)
    { core: "UMAP", names: ["International Conference on User Modeling, Adaptation, and Personalization", "International Conference on User Modeling", "International Conference on Adaptive Hypermedia and Adaptive Web-Based Systems"] },
    // Hot Chips is one venue under two acronyms (CCF "HOT CHIPS", CORE "HOTCHIPS (HCS)"): not a disagreement between the lists
    { ccf: "HOT CHIPS", core: "HOTCHIPS (HCS)", names: ["Symposium on High Performance Chips"] },
    // more venues the two lists give different acronyms (CSFW was the workshop, CSF is the symposium; CCF has two cloud rows)
    { ccf: "CSFW", core: "CSF", names: ["IEEE Computer Security Foundations Workshop", "IEEE Computer Security Foundations Symposium"] },
    { ccf: "WiSec", core: "ACM_WiSec", names: ["ACM Conference on Security and Privacy in Wireless and Mobile Networks"] },
    { ccf: "IEEE CEC", core: "CEC", names: ["IEEE Congress on Evolutionary Computation"] },
    { ccf: "IEEE BigData", core: "BigData", names: ["IEEE International Conference on Big Data"] },
    { ccf: "IEEE CLOUD", core: "CLOUD", names: ["IEEE International Conference on Cloud Computing"] },
    { ccf: "SSE", core: "IEEE SSE", names: ["IEEE International Conference on Software Services Engineering"] },

    // ICMI was the International Conference on Multimodal Interfaces until 2005 (CORE keeps the old name in a parenthesis)
    { ccf: "ICMI", core: "ICMI", names: ["International Conference on Multimodal Interfaces", "IEEE International Conference on Multimodal Interfaces"] },
    { ccf: "UbiComp", names: ["Ubicomp", "ACM International Joint Conference on Pervasive and Ubiquitous Computing", "International Conference on Ubiquitous Computing", "ACM Conference on Ubiquitous Computing"] },

    // ---- systems / architecture / networking
    // DATE: the name in full (a string Scholar cut right after "Conference and …" has nothing else to match)
    { ccf: "DATE", core: "DATE", names: ["Design, Automation and Test in Europe Conference and Exhibition", "Design Automation and Test in Europe Conference and Exhibition", "Design, Automation, and Test in Europe"] },
    { ccf: "SOSP", core: "SOSP", names: ["ACM Symposium on Operating Systems Principles", "Symposium on Operating Systems Principles", "ACM SIGOPS Symposium on Operating Systems Principles"] },
    { ccf: "OSDI", core: "OSDI", names: ["USENIX Symposium on Operating Systems Design and Implementation"] },
    { ccf: "NSDI", names: ["USENIX Symposium on Networked Systems Design and Implementation", "Symposium on Networked Systems Design and Implementation", "Symposium on Network System Design and Implementation"] },
    { ccf: "EuroSys", core: "EuroSys", names: ["European Conference on Computer Systems", "Conference on Computer Systems", "ACM European Conference on Computer Systems"] },
    { ccf: "ACM SIGOPS ATC", core: "USENIX", abbrs: ["USENIX ATC"], names: ["USENIX Annual Technical Conference", "USENIX Technical Conference", "USENIX ATC"] },
    { ccf: "FAST", core: "FAST", names: ["USENIX Conference on File and Storage Technologies"] },
    { ccf: "ASPLOS", core: "ASPLOS", names: ["International Conference on Architectural Support for Programming Languages and Operating Systems"] },
    // software engineering: the maintenance conference became ICSME in 2014 (CORE keeps the old name in a parenthesis)
    { ccf: "ICSME", core: "ICSME", abbrs: ["ICSM"], names: ["International Conference on Software Maintenance", "IEEE International Conference on Software Maintenance"] },
    // a cut-off "… Conference on Distributed Computing …" is ICDCS (DISC is a symposium)
    { ccf: "ICDCS", core: "ICDCS", names: ["International Conference on Distributed Computing Systems"] },
    // the CCF row spells it "Function Programming"
    { ccf: "ICFP", core: "ICFP", names: ["International Conference on Functional Programming", "ACM SIGPLAN International Conference on Functional Programming"] },
    { ccf: "ISCA", core: "ISCA", names: ["International Symposium on Computer Architecture", "Annual International Symposium on Computer Architecture", "ACM/IEEE Annual International Symposium on Computer Architecture"] },
    { ccf: "MICRO", core: "MICRO", names: ["IEEE/ACM International Symposium on Microarchitecture", "International Symposium on Microarchitecture"] },
    // HPDC was an IEEE symposium until 2008 (CCF and CORE name the ACM one): without this name a cut-off "13th IEEE International
    // Symposium on High performance …" reads as HPCA
    { ccf: "HPDC", core: "HPDC", names: ["IEEE International Symposium on High Performance Distributed Computing", "International Symposium on High Performance Distributed Computing"] },
    { ccf: "HPCA", core: "HPCA", names: ["IEEE International Symposium on High Performance Computer Architecture", "International Symposium on High-Performance Computer Architecture"] },
    { ccf: "SC", core: "SC", names: ["International Conference for High Performance Computing, Networking, Storage and Analysis", "Supercomputing", "ACM/IEEE Conference on Supercomputing", "ACM/IEEE Supercomputing Conference", "Conference on Supercomputing"] },
    { ccf: "SIGCOMM", core: "SIGCOMM", names: [
      "ACM SIGCOMM Conference", "Conference on Applications, Technologies, Architectures, and Protocols for Computer Communication",
      "ACM Special Interest Group on Data Communication", "SIGCOMM Conference on Data Communication"
    ] },
    { ccf: "INFOCOM", core: "INFOCOM", names: ["IEEE Conference on Computer Communications", "IEEE INFOCOM", "Annual Joint Conference of the IEEE Computer and Communications Societies"] },
    // (MobiCom 1996–1999 was an ACM/IEEE conference: "Proceedings of the 3rd annual ACM/IEEE international conference on Mobile …")
    { ccf: "MobiCom", core: "MOBICOM", names: ["ACM International Conference on Mobile Computing and Networking", "International Conference on Mobile Computing and Networking", "ACM/IEEE International Conference on Mobile Computing and Networking"] },
    // CORE spells IV "Visualisation"; Scholar prints the American spelling (and "Information Visualization in Biomedical Informatics" is another venue)
    { core: "IV", names: ["International Conference on Information Visualization"], starts: ["International Conference on Information Visualization"] },
    // FSTTCS as the IARCS printed it in 2015 and after: "35th IARCS Annual Conference on Foundations of Software Technology and …"
    { ccf: "FSTTCS", names: ["IARCS Annual Conference on Foundations of Software Technology and Theoretical Computer Science"], starts: ["IARCS Annual Conference on Foundations of Software Technology and"] },
    // PKC as the IACR's own series prints it: "IACR International Conference on Public-Key Cryptography" (no other conference is called that)
    { ccf: "PKC", core: "PKC", names: ["IACR International Conference on Public-Key Cryptography"] },
    // CCC until 1995 was the Conference on Structure in Complexity Theory
    { ccf: "CCC", core: "CCC", names: ["Annual Conference on Structure in Complexity Theory", "IEEE Annual Conference on Structure in Complexity Theory"], starts: ["IEEE Annual Conference on Structure in Complexity Theory", "Annual Conference on Structure in Complexity Theory"] },
    // FoSSaCS, as ETAPS and Springer print it: "… Foundations of Software Science and Computation Structures" (CORE has "Computational")
    { core: "FOSSACS", names: ["International Conference on Foundations of Software Science and Computation Structures"] },
    // ICWSM's first name, which the AAAI printed: "AAAI International Conference on Weblogs and Social Media"
    { ccf: "ICWSM", core: "ICWSM", names: ["International Conference on Weblogs and Social Media"] },
    // CORE names ITiCSE "Annual Conference on …"; Scholar prints the SIGCSE conference (the SIGCSE Technical Symposium is another venue)
    { core: "ITiCSE", names: ["ACM SIGCSE Conference on Innovation and Technology in Computer Science Education", "SIGCSE Conference on Innovation and Technology in Computer Science Education", "International Conference on Innovation and Technology in Computer Science Education"] },
    // LPAR's current name (CORE lists the older "Logic Programming and Automated Reasoning"); ACII's (CORE's name stops at "Intelligent"); ISoLA's, which Scholar prints without its subtitle
    { core: "LPAR", names: ["International Conference on Logic for Programming, Artificial Intelligence and Reasoning"] },
    { core: "ACII", names: ["International Conference on Affective Computing and Intelligent Interaction"] },
    { core: "ISoLA", names: ["International Symposium on Leveraging Applications of Formal Methods"] },
    // XP's first names, before it became the conference on agile software development
    { core: "XP", names: ["International Conference on Extreme Programming", "International Conference on Extreme Programming and Agile Processes in Software Engineering", "International Conference on Agile Software Development"] },
    { ccf: "SIGMETRICS", core: "SIGMETRICS", names: ["Proceedings of the ACM on Measurement and Analysis of Computing Systems", "ACM SIGMETRICS International Conference on Measurement and Modeling of Computer Systems"] },
    { core: "EC", names: ["ACM Conference on Electronic Commerce", "ACM Conference on Economics and Computation"] },

    // ---- security / crypto
    { ccf: "CCS", core: "CCS", names: ["ACM SIGSAC Conference on Computer and Communications Security", "ACM Conference on Computer and Communications Security"] },
    { ccf: "S&P", core: "SP", names: ["IEEE Symposium on Security and Privacy", "Symposium on Security and Privacy"] },
    { ccf: "USENIX Security", core: "USENIX-Security", names: ["USENIX Security Symposium"] },
    { ccf: "NDSS", core: "NDSS", names: ["Network and Distributed System Security Symposium", "Network and Distributed Systems Security Symposium"] },
    { ccf: "CRYPTO", core: "CRYPTO", names: ["Annual International Cryptology Conference", "International Cryptology Conference", "Advances in Cryptology - CRYPTO"] },
    { ccf: "EUROCRYPT", core: "EuroCrypt", names: ["Annual International Conference on the Theory and Applications of Cryptographic Techniques", "Advances in Cryptology - EUROCRYPT"] },

    // ---- software engineering / PL / theory / graphics
    { ccf: "ICSE", core: "ICSE", names: ["International Conference on Software Engineering", "IEEE/ACM International Conference on Software Engineering", "ACM/IEEE International Conference on Software Engineering"] },
    { ccf: "FSE", ccfTier: "A", core: "FSE", coreRank: "A*", abbrs: ["ESEC/FSE"], names: [
      "Joint Meeting on Foundations of Software Engineering", "ACM SIGSOFT Symposium on the Foundations of Software Engineering",
      "European Software Engineering Conference and Symposium on the Foundations of Software Engineering", "ESEC/FSE",
      // the ACM Digital Library's titles of 2003, 2005 and 2011
      "ACM SIGSOFT Symposium and the European Conference on Foundations of Software Engineering",
      "European Software Engineering Conference held jointly with ACM SIGSOFT International Symposium on Foundations of Software Engineering"
    ] },
    { ccf: "FM", core: "FM", names: ["International Symposium of Formal Methods Europe"] },
    { ccf: "ASE", core: "ASE", names: ["IEEE/ACM International Conference on Automated Software Engineering", "ACM/IEEE International Conference on Automated Software Engineering"] },
    // the ACM Digital Library's titles of RECOMB: "Proceedings of the sixth annual international conference on Computational biology"
    { ccf: "RECOMB", core: "RECOMB", names: ["Annual International Conference on Computational Molecular Biology", "International Conference on Computational Molecular Biology"], starts: ["Annual International Conference on Computational"] },
    { ccf: "ISSTA", core: "ISSTA", names: ["International Symposium on Software Testing and Analysis", "ACM SIGSOFT International Symposium on Software Testing and Analysis", "ACM SIGSOFT International Symposium on Software Testing & Analysis"] },
    { ccf: "PLDI", core: "PLDI", names: ["ACM SIGPLAN Conference on Programming Language Design and Implementation"] },
    { ccf: "POPL", core: "POPL", names: ["ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages", "ACM SIGPLAN Symposium on Principles of Programming Languages", "Symposium on Principles of Programming Languages"] },
    // PODS: CCF writes SIGAI, CORE and the proceedings SIGART
    { ccf: "PODS", names: ["ACM SIGMOD-SIGACT-SIGART Symposium on Principles of Database Systems", "ACM SIGACT-SIGMOD Symposium on Principles of Database Systems", "Symposium on Principles of Database Systems"] },
    { core: "PODS", names: ["ACM SIGMOD-SIGACT-SIGAI Symposium on Principles of Database Systems", "ACM SIGMOD-SIGACT-SIGART Symposium on Principles of Database Systems", "ACM SIGACT-SIGMOD Symposium on Principles of Database Systems", "Symposium on Principles of Database Systems"] },
    { ccf: "OOPSLA", core: "OOPSLA", names: ["ACM SIGPLAN International Conference on Object-Oriented Programming, Systems, Languages, and Applications"] },
    { ccf: "STOC", core: "STOC", names: ["ACM Symposium on Theory of Computing", "ACM SIGACT Symposium on Theory of Computing"] },
    { ccf: "FOCS", core: "FOCS", names: ["IEEE Symposium on Foundations of Computer Science", "Annual Symposium on Foundations of Computer Science"], starts: ["Foundations of Computer Science Proceedings Annual Symposium on"] },
    { ccf: "SIGGRAPH", core: "SIGGRAPH", names: ["ACM SIGGRAPH Conference", "International Conference on Computer Graphics and Interactive Techniques"] },

    // ---- rows whose official PDF text has a typo or a stray word (kept verbatim in data/):
    //      give the correct spelling so Scholar's strings still match
    { ccf: "Euro-Par", names: ["European Conference on Parallel and Distributed Computing", "Euro-Par"] },
    { ccf: "MoDELS", names: ["ACM/IEEE International Conference on Model Driven Engineering Languages and Systems"] },
    { ccf: "PG", names: ["Pacific Conference on Computer Graphics and Applications", "Pacific Graphics"] },
    { ccf: "PASTE", names: ["ACM SIGPLAN-SIGSOFT Workshop on Program Analysis for Software Tools and Engineering"] },
    { ccf: "HotStorage", names: ["Hot Topics in Storage and File Systems", "USENIX Workshop on Hot Topics in Storage and File Systems"] },
    { ccf: "JCC", names: ["International Conference on Joint Cloud Computing"] },
    { ccf: "SAC", core: "SAC", noBareAcronym: true, names: ["Selected Areas in Cryptography"] },
    // earlier or sponsor-carrying names Scholar prints (the lists give the current ones)
    { ccf: "SPAA", core: "SPAA", names: ["ACM Symposium on Parallel Algorithms and Architectures", "Symposium on Parallel Algorithms and Architectures"] },
    { ccf: "SenSys", names: ["ACM Conference on Embedded Network Sensor Systems", "ACM International Conference on Embedded Networked Sensor Systems", "International Conference on Embedded Networked Sensor Systems"] },
    { ccf: "CoNEXT", core: "CoNEXT", names: ["ACM CoNEXT Conference", "CoNEXT Conference"] },
    { ccf: "SECON", core: "SECON", names: ["IEEE Communications Society Conference on Sensor, Mesh and Ad Hoc Communications and Networks", "Sensor, Mesh and Ad Hoc Communications and Networks"] },
    { core: "SIGCSE", names: ["ACM Technical Symposium on Computer Science Education", "SIGCSE Technical Symposium on Computer Science Education", "ACM SIGCSE Technical Symposium on Computer Science Education", "Technical Symposium on Computer Science Education", "ACM Technical Symposium on Computing Science Education"] },
    { core: "SIGdial", names: ["SIGdial Meeting on Discourse and Dialogue", "Annual SIGdial Meeting on Discourse and Dialogue", "Annual Meeting of the Special Interest Group on Discourse and Dialogue"] },
    // ASSETS was the International ACM Conference on Assistive Technologies (1994–2004)
    { ccf: "ASSETS", core: "ASSETS", names: ["International ACM Conference on Assistive Technologies", "ACM Conference on Assistive Technologies", "ACM SIGACCESS Conference on Computers and Accessibility"] },
    { ccf: "ACISP", names: ["Australasian Conference on Information Security and Privacy"] },
    { ccf: "CT-RSA", core: "CT-RSA", names: ["Cryptographers' Track at the RSA Conference", "Cryptographers' Track at RSA Conference"] },
    // AsiaCCS was the ACM Symposium on Information, Computer and Communications Security (ASIACCS 2006–2010)
    { ccf: "AsiaCCS", core: "AsiaCCS", names: ["ACM Symposium on Information, Computer and Communications Security"] },
    { ccf: "P2P", names: ["IEEE International Conference on Peer-to-Peer Computing", "IEEE International Conference on P2P Computing"] },

    // ---- journals (kind J)
    { ccf: "TOPS", kind: "J", names: ["ACM Transactions on Information and System Security"] },
    // the speech journal of the IEEE Signal Processing Society, under its earlier name (1993–2005)
    { ccf: "TASLP", kind: "J", names: ["IEEE Transactions on Speech and Audio Processing"] },
    // ISO-4 abbreviations as DBLP / BibTeX print them (the full names already match by themselves)
    { ccf: "TOG", kind: "J", names: ["ACM Trans. Graph.", "ACM Trans. on Graphics"] },
    { ccf: "TOCS", kind: "J", names: ["ACM Trans. Comput. Syst."] },
    { ccf: "TODS", kind: "J", names: ["ACM Trans. Database Syst."] },
    { ccf: "TOIS", kind: "J", names: ["ACM Trans. Inf. Syst."] },
    { ccf: "TOPLAS", kind: "J", names: ["ACM Trans. Program. Lang. Syst."] },
    { ccf: "TOSEM", kind: "J", names: ["ACM Trans. Softw. Eng. Methodol."] },
    { ccf: "TOCHI", kind: "J", names: ["ACM Trans. Comput. Hum. Interact."] },
    { ccf: "TSE", kind: "J", names: ["IEEE Trans. Softw. Eng."] },
    { ccf: "TPAMI", kind: "J", names: ["IEEE Trans. Pattern Anal. Mach. Intell."] },
    { ccf: "TIP", kind: "J", names: ["IEEE Trans. Image Process."] },
    { ccf: "TVCG", kind: "J", names: ["IEEE Trans. Vis. Comput. Graph."] },
    { ccf: "TIT", kind: "J", names: ["IEEE Trans. Inf. Theory"] },
    { ccf: "TC", kind: "J", names: ["IEEE Trans. Comput."] },
    { ccf: "TKDE", kind: "J", names: ["IEEE Trans. Knowl. Data Eng."] },
    { ccf: "TPDS", kind: "J", names: ["IEEE Trans. Parallel Distributed Syst.", "IEEE Trans. Parallel Distrib. Syst."] },
    { ccf: "TMC", kind: "J", names: ["IEEE Trans. Mob. Comput."] },
    { ccf: "TDSC", kind: "J", names: ["IEEE Trans. Dependable Secur. Comput.", "IEEE Trans. Dependable Secure Comput."] },
    { ccf: "TIFS", kind: "J", names: ["IEEE Trans. Inf. Forensics Secur."] },
    { ccf: "TON", kind: "J", names: ["IEEE/ACM Trans. Netw.", "IEEE/ACM Transactions on Networking"] },
    { ccf: "IJCV", kind: "J", names: ["Int. J. Comput. Vis.", "Int. J. Comput. Vision"] },
    { ccf: "JMLR", kind: "J", names: ["J. Mach. Learn. Res."] },
    { ccf: "VLDBJ", kind: "J", names: ["VLDB J."] },
    // unranked events that a ranked venue's name would otherwise claim (found by running the names of the most-cited conferences through the matcher)
    { shadow: ["ICCC", "CISP", "TENSYMP", "ASYU", "CAI", "ICTIR", "ISCISC", "ICCIT", "COMM", "ICNLP", "JCC", "MODSIM", "ONCON", "IntelliSys", "ICALTE", "ICSOFT-PT"] }
  ];
});
