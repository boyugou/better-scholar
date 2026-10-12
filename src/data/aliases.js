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
    { ccf: "INTERSPEECH", core: "Interspeech", names: ["Conference of the International Speech Communication Association", "Annual Conference of the International Speech Communication Association"] },
    { ccf: "ICASSP", names: ["IEEE International Conference on Acoustics, Speech and Signal Processing"] },

    // ---- data mining / databases / IR
    { ccf: "SIGKDD", core: "KDD", names: ["ACM SIGKDD International Conference on Knowledge Discovery and Data Mining", "SIGKDD International Conference on Knowledge Discovery in Data Mining", "Knowledge Discovery and Data Mining"] },
    { ccf: "WWW", core: "WWW", names: ["International Conference on World Wide Web", "International World Wide Web Conference", "World Wide Web Conference", "The Web Conference", "WWW Conference"] },
    { ccf: "SIGMOD", core: "SIGMOD", names: ["International Conference on Management of Data", "ACM SIGMOD International Conference on Management of Data", "ACM Special Interest Group on Management of Data", "Proceedings of the ACM on Management of Data"] },
    { ccf: "VLDB", core: "VLDB", names: ["Proceedings of the VLDB Endowment", "International Conference on Very Large Data Bases", "VLDB Conference"] },
    { ccf: "ICDE", core: "ICDE", names: ["IEEE International Conference on Data Engineering", "International Conference on Data Engineering"] },
    { ccf: "WSDM", core: "WSDM", names: ["ACM International Conference on Web Search and Data Mining", "International Conference on Web Search and Data Mining"] },
    { ccf: "CIKM", core: "CIKM", names: ["ACM International Conference on Information and Knowledge Management", "International Conference on Information and Knowledge Management"] },
    { ccf: "SIGIR", core: "SIGIR", names: ["International ACM SIGIR Conference on Research and Development in Information Retrieval", "ACM SIGIR Conference on Research and Development in Information Retrieval"] },
    { ccf: "RecSys", core: "RecSys", names: ["ACM Conference on Recommender Systems"] },

    // ---- HCI
    { ccf: "CHI", core: "CHI", names: ["ACM Conference on Human Factors in Computing Systems", "SIGCHI Conference on Human Factors in Computing Systems", "Conference on Human Factors in Computing Systems"] },
    { ccf: "UIST", core: "UIST", names: ["ACM Symposium on User Interface Software and Technology"] },
    { ccf: "CSCW", core: "CSCW", names: ["ACM Conference on Computer Supported Cooperative Work", "ACM Conference on Computer-Supported Cooperative Work and Social Computing", "Computer Supported Cooperative Work"] },
    { ccf: "UbiComp", names: ["ACM International Joint Conference on Pervasive and Ubiquitous Computing", "International Conference on Ubiquitous Computing", "ACM Conference on Ubiquitous Computing"] },

    // ---- systems / architecture / networking
    { ccf: "SOSP", core: "SOSP", names: ["ACM Symposium on Operating Systems Principles", "Symposium on Operating Systems Principles"] },
    { ccf: "OSDI", core: "OSDI", names: ["USENIX Symposium on Operating Systems Design and Implementation"] },
    { ccf: "NSDI", names: ["USENIX Symposium on Networked Systems Design and Implementation", "Symposium on Networked Systems Design and Implementation", "Symposium on Network System Design and Implementation"] },
    { ccf: "EuroSys", core: "EuroSys", names: ["European Conference on Computer Systems", "Conference on Computer Systems", "ACM European Conference on Computer Systems"] },
    { ccf: "ACM SIGOPS ATC", core: "USENIX", names: ["USENIX Annual Technical Conference", "USENIX Technical Conference", "USENIX ATC"] },
    { ccf: "FAST", core: "FAST", names: ["USENIX Conference on File and Storage Technologies"] },
    { ccf: "ASPLOS", core: "ASPLOS", names: ["International Conference on Architectural Support for Programming Languages and Operating Systems"] },
    { ccf: "ISCA", core: "ISCA", names: ["International Symposium on Computer Architecture", "Annual International Symposium on Computer Architecture", "ACM/IEEE Annual International Symposium on Computer Architecture"] },
    { ccf: "MICRO", core: "MICRO", names: ["IEEE/ACM International Symposium on Microarchitecture", "International Symposium on Microarchitecture"] },
    { ccf: "HPCA", core: "HPCA", names: ["IEEE International Symposium on High Performance Computer Architecture", "International Symposium on High-Performance Computer Architecture"] },
    { ccf: "SC", core: "SC", names: ["International Conference for High Performance Computing, Networking, Storage and Analysis", "Supercomputing"] },
    { ccf: "SIGCOMM", core: "SIGCOMM", names: [
      "ACM SIGCOMM Conference", "Conference on Applications, Technologies, Architectures, and Protocols for Computer Communication",
      "ACM Special Interest Group on Data Communication", "SIGCOMM Conference on Data Communication"
    ] },
    { ccf: "INFOCOM", core: "INFOCOM", names: ["IEEE Conference on Computer Communications", "IEEE INFOCOM"] },
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
    { ccf: "ICSE", core: "ICSE", names: ["International Conference on Software Engineering", "IEEE/ACM International Conference on Software Engineering"] },
    { ccf: "FSE", ccfTier: "A", core: "FSE", coreRank: "A*", names: [
      "Joint Meeting on Foundations of Software Engineering", "ACM SIGSOFT Symposium on the Foundations of Software Engineering",
      "European Software Engineering Conference and Symposium on the Foundations of Software Engineering", "ESEC/FSE"
    ] },
    { ccf: "ASE", core: "ASE", names: ["IEEE/ACM International Conference on Automated Software Engineering"] },
    { ccf: "ISSTA", core: "ISSTA", names: ["International Symposium on Software Testing and Analysis"] },
    { ccf: "PLDI", core: "PLDI", names: ["ACM SIGPLAN Conference on Programming Language Design and Implementation"] },
    { ccf: "POPL", core: "POPL", names: ["ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages"] },
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
    { ccf: "TOPS", kind: "J", names: ["ACM Transactions on Information and System Security"] }
  ];
});
