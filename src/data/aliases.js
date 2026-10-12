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
    { ccf: "IJCAI", core: "IJCAI", names: ["International Joint Conference on Artificial Intelligence"] },
    { ccf: "AISTATS", core: "AISTATS", names: ["International Workshop on Artificial Intelligence and Statistics", "Artificial Intelligence and Statistics"] },
    { ccf: "COLT", core: "COLT", names: ["Conference on Learning Theory", "Annual Conference on Learning Theory", "Computational Learning Theory"] },
    { ccf: "UAI", core: "UAI", names: ["Conference on Uncertainty in Artificial Intelligence", "Uncertainty in Artificial Intelligence"] },
    // ECML (until 2007 its own conference) and PKDD (until 2007) are the two halves of one venue today
    { ccf: "ECML-PKDD", core: "ECML PKDD", abbrs: ["ECML", "PKDD", "ECML PKDD", "ECML-PKDD"], names: ["European Conference on Machine Learning", "European Conference on Principles and Practice of Knowledge Discovery in Databases", "European Conference on Principles of Data Mining and Knowledge Discovery", "Joint European Conference on Machine Learning and Knowledge Discovery in Databases", "Machine Learning and Knowledge Discovery in Databases"] },

    // ---- vision
    { ccf: "CVPR", core: "CVPR", names: ["IEEE Conference on Computer Vision and Pattern Recognition", "IEEE/CVF Conference on Computer Vision and Pattern Recognition", "Computer Vision and Pattern Recognition"] },
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
      "North American Chapter of the Association for Computational Linguistics: Human Language Technologies"
    ] },
    { ccf: "COLING", core: "COLING", names: ["International Conference on Computational Linguistics"] },
    { core: "EACL", names: ["Conference of the European Chapter of the Association for Computational Linguistics", "European Chapter of the Association for Computational Linguistics"] },
    { ccf: "CoNLL", core: "CoNLL", names: ["Conference on Computational Natural Language Learning", "Computational Natural Language Learning"] },
    { ccf: "INTERSPEECH", core: "Interspeech", names: ["Conference of the International Speech Communication Association", "Annual Conference of the International Speech Communication Association", "Interspeech"] },
    { ccf: "ICASSP", names: ["IEEE International Conference on Acoustics, Speech and Signal Processing"] },

    // ---- data mining / databases / IR
    { ccf: "SIGKDD", core: "KDD", abbrs: ["KDD", "SIGKDD"], names: ["ACM SIGKDD International Conference on Knowledge Discovery and Data Mining", "SIGKDD International Conference on Knowledge Discovery in Data Mining", "Knowledge Discovery and Data Mining"] },
    { ccf: "WWW", core: "WWW", names: ["International Conference on World Wide Web", "International World Wide Web Conference", "World Wide Web Conference", "The Web Conference", "WWW Conference", "ACM Web Conference"] },
    { ccf: "SIGMOD", core: "SIGMOD", names: ["International Conference on Management of Data", "ACM SIGMOD International Conference on Management of Data", "ACM Special Interest Group on Management of Data", "Proceedings of the ACM on Management of Data"] },
    { ccf: "VLDB", core: "VLDB", names: ["Proceedings of the VLDB Endowment", "International Conference on Very Large Data Bases", "VLDB Conference"] },
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
    // ICMI was the International Conference on Multimodal Interfaces until 2005 (CORE keeps the old name in a parenthesis)
    { ccf: "ICMI", core: "ICMI", names: ["International Conference on Multimodal Interfaces", "IEEE International Conference on Multimodal Interfaces"] },
    { ccf: "UbiComp", names: ["ACM International Joint Conference on Pervasive and Ubiquitous Computing", "International Conference on Ubiquitous Computing", "ACM Conference on Ubiquitous Computing"] },

    // ---- systems / architecture / networking
    // DATE: the name in full (a string Scholar cut right after "Conference and …" has nothing else to match)
    { ccf: "DATE", core: "DATE", names: ["Design, Automation and Test in Europe Conference and Exhibition", "Design Automation and Test in Europe Conference and Exhibition", "Design, Automation, and Test in Europe"] },
    { ccf: "SOSP", core: "SOSP", names: ["ACM Symposium on Operating Systems Principles", "Symposium on Operating Systems Principles", "ACM SIGOPS Symposium on Operating Systems Principles"] },
    { ccf: "OSDI", core: "OSDI", names: ["USENIX Symposium on Operating Systems Design and Implementation"] },
    { ccf: "NSDI", names: ["USENIX Symposium on Networked Systems Design and Implementation", "Symposium on Networked Systems Design and Implementation", "Symposium on Network System Design and Implementation"] },
    { ccf: "EuroSys", core: "EuroSys", names: ["European Conference on Computer Systems", "Conference on Computer Systems", "ACM European Conference on Computer Systems"] },
    { ccf: "ACM SIGOPS ATC", core: "USENIX", names: ["USENIX Annual Technical Conference", "USENIX Technical Conference", "USENIX ATC"] },
    { ccf: "FAST", core: "FAST", names: ["USENIX Conference on File and Storage Technologies"] },
    { ccf: "ASPLOS", core: "ASPLOS", names: ["International Conference on Architectural Support for Programming Languages and Operating Systems"] },
    // software engineering: the maintenance conference became ICSME in 2014 (CORE keeps the old name in a parenthesis)
    { ccf: "ICSME", core: "ICSME", abbrs: ["ICSM"], names: ["International Conference on Software Maintenance", "IEEE International Conference on Software Maintenance"] },
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
    { ccf: "MobiCom", core: "MOBICOM", names: ["ACM International Conference on Mobile Computing and Networking", "International Conference on Mobile Computing and Networking"] },
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
    { ccf: "FSE", ccfTier: "A", core: "FSE", coreRank: "A*", names: [
      "Joint Meeting on Foundations of Software Engineering", "ACM SIGSOFT Symposium on the Foundations of Software Engineering",
      "European Software Engineering Conference and Symposium on the Foundations of Software Engineering", "ESEC/FSE"
    ] },
    { ccf: "ASE", core: "ASE", names: ["IEEE/ACM International Conference on Automated Software Engineering", "ACM/IEEE International Conference on Automated Software Engineering"] },
    { ccf: "ISSTA", core: "ISSTA", names: ["International Symposium on Software Testing and Analysis"] },
    { ccf: "PLDI", core: "PLDI", names: ["ACM SIGPLAN Conference on Programming Language Design and Implementation"] },
    { ccf: "POPL", core: "POPL", names: ["ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages", "ACM SIGPLAN Symposium on Principles of Programming Languages", "Symposium on Principles of Programming Languages"] },
    // PODS: CCF writes SIGAI, CORE and the proceedings SIGART
    { ccf: "PODS", names: ["ACM SIGMOD-SIGACT-SIGART Symposium on Principles of Database Systems", "Symposium on Principles of Database Systems"] },
    { core: "PODS", names: ["ACM SIGMOD-SIGACT-SIGAI Symposium on Principles of Database Systems", "ACM SIGMOD-SIGACT-SIGART Symposium on Principles of Database Systems", "Symposium on Principles of Database Systems"] },
    { ccf: "OOPSLA", core: "OOPSLA", names: ["ACM SIGPLAN International Conference on Object-Oriented Programming, Systems, Languages, and Applications"] },
    { ccf: "STOC", core: "STOC", names: ["ACM Symposium on Theory of Computing", "ACM SIGACT Symposium on Theory of Computing"] },
    { ccf: "FOCS", core: "FOCS", names: ["IEEE Symposium on Foundations of Computer Science", "Annual Symposium on Foundations of Computer Science"] },
    { ccf: "SIGGRAPH", core: "SIGGRAPH", names: ["ACM SIGGRAPH Conference", "International Conference on Computer Graphics and Interactive Techniques"] },

    // ---- rows whose official PDF text has a typo or a stray word (kept verbatim in data/):
    //      give the correct spelling so Scholar's strings still match
    { ccf: "Euro-Par", names: ["European Conference on Parallel and Distributed Computing", "Euro-Par"] },
    { ccf: "MoDELS", names: ["ACM/IEEE International Conference on Model Driven Engineering Languages and Systems"] },
    { ccf: "PG", names: ["Pacific Conference on Computer Graphics and Applications", "Pacific Graphics"] },
    { ccf: "PASTE", names: ["ACM SIGPLAN-SIGSOFT Workshop on Program Analysis for Software Tools and Engineering"] },
    { ccf: "HotStorage", names: ["Hot Topics in Storage and File Systems", "USENIX Workshop on Hot Topics in Storage and File Systems"] },
    { ccf: "JCC", names: ["International Conference on Joint Cloud Computing"] },
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
    { ccf: "VLDBJ", kind: "J", names: ["VLDB J."] }
  ];
});
