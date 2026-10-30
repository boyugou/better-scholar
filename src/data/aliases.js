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
//   former        names the venue had, or is printed under, that say "Workshop" where the list's name does not: found by name, and a string that carries one whole is the venue
//                 (any other "… Workshop on …" at it is a track); not part of the venue's wording otherwise, so they do not make its "Conference" a clash
//   renamed       the list's name for the row is a name the venue had (CORE's WACV: "IEEE Workshop on Applications of Computer Vision"): its "Workshop" is no longer what the venue is
//   fullOnly      extra names whose organisation is part of what they say ("USENIX ATC"): read whole, never as the bare acronym that is left once the organisation is dropped ("ATC")
//   noBareAcronym the acronym alone proves nothing: another, unranked venue is called the same ("SAC" is also ACM's Symposium on
//                 Applied Computing) — only the name counts
//   starts        visible starts of a cut-off string that are read as this venue although other venues begin the same way
//                 (the ACL Anthology's "Proceedings of the 23rd International Conference on Computational …" is COLING, not ICCSA);
//                 "annual" and any sponsor the start names (IEEE, ACM, a SIG) are part of the start: the IEEE's "… Conference on
//                 Computational …" is not COLING, and nothing here is a start that only some of the venue's years fit
//   uncut         names that are only read whole, with their organisation, in a string that Scholar did not cut off: where the cut ends the same words
//                 begin another venue's name (HiPC's old "IEEE International Conference on High Performance Computing" — its cut is as much HPCC's "… and Communications")
//   volume        names of a journal that are also a field ("Computational Geometry"): they count for a line that has a volume, a journal's — "Computational geometry, 307-317, 2000" is a chapter of a book
//   trackVolume   the venue's proceedings come in two volumes and the second holds posters, panels, workshops or demos ("V. 2", "Vol. 2", "Volume 2", "Volume B"): a line that names
//                 that volume gets no rank (checked against ACM's own records, 2026-10-29: SIGCSE TS 2022–25, ITiCSE 2023, ICER 2022–26 — one- or two-page items —, SPLC 2011–25 — workshops,
//                 demos, tutorials)
//   shadow        (an entry of its own, no ccf / core) acronyms of unranked events whose names boil down to the words of a ranked venue's: a string that names one of them
//                 by its acronym — "International Conference on Computer and Communications (ICCC)" is not INFOCOM, "International Congress on Image and Signal
//                 Processing (CISP)" not ICISP, "IEEE Region 10 Symposium (TENSYMP)" not TENCON — gets no badge from either list. An entry may be { acronym, with }:
//                 the acronym only counts when the string also holds that word ("ICCC" is ranked too, the Computational Creativity conference)
//                 It may also be { name }: an unranked event whose whole name, organisations included, boils down to words of a ranked venue's ("ACM Symposium on Applied Computing" is
//                 not CORE's Applied Computing Conference; "Proceedings of the ACM on Computer Graphics and Interactive Techniques" is a journal for I3D, HPG and SCA, not SIGGRAPH).
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
    // AAMAS began in 2002 as the merger of the Autonomous Agents conference, ICMAS and ATAL; its proceedings (ACM, IFAAMAS) are titled without "Joint"
    { ccf: "AAMAS", core: "AAMAS", names: ["International Conference on Autonomous Agents", "International Conference on Multiagent Systems", "International Conference on Multi-Agent Systems", "International Conference on Autonomous Agents and Multiagent Systems"] },
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
      "Human Language Technologies: The Annual Conference of the North American Chapter of the Association for Computational Linguistics",
      // the 2025 name
      "Nations of the Americas Chapter of the Association for Computational Linguistics",
      "Nations of the Americas Chapter of the Association for Computational Linguistics: Human Language Technologies"
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
    { ccf: "EGSR", names: ["Eurographics Workshop on Rendering", "Eurographics Workshop on Rendering Techniques", "Eurographics Rendering Workshop", "Eurographics Conference on Rendering Techniques", "Rendering Techniques"] },
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
    { ccf: "CSFW", core: "CSF", names: ["IEEE Computer Security Foundations Workshop", "IEEE Computer Security Foundations Symposium", "Workshop on Computer Security Foundations"] },
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
    { ccf: "ACM SIGOPS ATC", core: "USENIX", abbrs: ["USENIX ATC"], fullOnly: ["USENIX ATC"], names: ["USENIX Annual Technical Conference", "USENIX Technical Conference"] },          // ("USENIX ATC" is not also the bare "ATC": that is CORE's Advanced and Trusted Computing)
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
    // (the joint event of the Web Intelligence conference and the Intelligent Agent Technology conference: CORE's WI, "previously joint with" it)
    { core: "WI", names: ["IEEE/WIC/ACM International Conference on Web Intelligence and Intelligent Agent Technology", "IEEE/WIC/ACM International Joint Conference on Web Intelligence and Intelligent Agent Technology", "IEEE/WIC/ACM International Joint Conferences on Web Intelligence and Intelligent Agent Technologies", "Web Intelligence and Intelligent Agent Technology"] },
    // (the 2000 volume title)
    { core: "EKAW", names: ["Knowledge Engineering and Knowledge Management Methods, Models, and Tools"] },
    // (the symposium's older title in the singular — "Second IEEE Symposium on Computer and Communications" is ISCC, not INFOCOM — and the symposium CORE calls a conference)
    { ccf: "ISCC", core: "ISCC", names: ["IEEE Symposium on Computer and Communications"] },
    { core: "RO-MAN", names: ["IEEE International Symposium on Robot and Human Interactive Communication"] },
    // (CORE words these with a typo or a different last word: "Personal and Indoor Mobile Radio Conference", "ACM-SIGRAPH …", "… Financial Engineering"; the VIS of 2024 is "Visualization and Visual Analytics",
    // the Visualization conference)
    { core: "PIMRC", names: ["IEEE International Symposium on Personal, Indoor and Mobile Radio Communications"] },
    { core: "IEEE CIFEr", names: ["IEEE Symposium on Computational Intelligence for Financial Engineering and Economics", "IEEE Conference on Computational Intelligence for Financial Engineering & Economics"] },
    { ccf: "I3D", core: "I3DG", names: ["ACM SIGGRAPH Symposium on Interactive 3D Graphics and Games", "Symposium on Interactive 3D Graphics and Games"] },
    // (IPDPS began as two symposia, the International Parallel Processing Symposium and the Symposium on Parallel and Distributed Processing, that merged in 1998)
    { ccf: "IPDPS", core: "IPDPS", names: ["International Parallel Processing Symposium", "IEEE Symposium on Parallel and Distributed Processing"] },
    { ccf: "IEEE VIS", core: "IEEE VIS", names: ["IEEE Visualization and Visual Analytics"] },          // (the symposium on Information Visualization, 1995–2006, is not VIS: CCF's VIS is the Visualization conference of DBLP's conf/visualization)
    // (the years a conference was held jointly with another say so in the title: "Joint" is part of the name those years)
    { ccf: "RE", core: "RE", names: ["IEEE Joint International Conference on Requirements Engineering", "IEEE Joint International Requirements Engineering Conference"] },
    { ccf: "SIGMETRICS", core: "SIGMETRICS", names: ["Joint International Conference on Measurement and Modeling of Computer Systems", "ACM SIGMETRICS Joint International Conference on Measurement and Modeling of Computer Systems"] },
    // (the conference calls itself both: "InSITE: Informing Science + IT Education Conference", and "… Joint Conference" in some years)
    { core: "InSITE", names: ["Informing Science and Information Technology Education Joint Conference", "Informing Science and IT Education Joint Conference", "Informing Science and IT Education Conference"] },
    // (Shape Modeling International was the Shape Modeling Applications conference until 2007)
    { ccf: "SMI", names: ["International Conference on Shape Modeling and Applications", "IEEE International Conference on Shape Modeling and Applications"] },
    { core: "ACII", names: ["International Conference on Affective Computing and Intelligent Interaction"] },
    { core: "ISoLA", names: ["International Symposium on Leveraging Applications of Formal Methods"] },
    // XP's first names, before it became the conference on agile software development
    { core: "XP", names: ["International Conference on Extreme Programming", "International Conference on Extreme Programming and Agile Processes in Software Engineering", "International Conference on Agile Software Development"] },
    { ccf: "SIGMETRICS", core: "SIGMETRICS", names: ["Proceedings of the ACM on Measurement and Analysis of Computing Systems", "ACM SIGMETRICS International Conference on Measurement and Modeling of Computer Systems"] },
    { core: "EC", names: ["ACM Conference on Electronic Commerce", "ACM Conference on Economics and Computation"] },
    // IPCCC before 2000: the Phoenix Conference on Computers and Communications (OpenAlex files its proceedings under that name, "IPCCC", as the IEEE's series)
    { ccf: "IPCCC", core: "IPCCC", names: ["International Phoenix Conference on Computers and Communications"] },

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
    // (since 2024 ACM prints the proceedings as "Special Interest Group on Computer Graphics and Interactive Techniques Conference" — "Conference Papers" is the main track, "Courses", "Posters" … are not)
    { ccf: "SIGGRAPH", core: "SIGGRAPH", names: ["ACM SIGGRAPH Conference", "International Conference on Computer Graphics and Interactive Techniques", "Special Interest Group on Computer Graphics and Interactive Techniques Conference", "Special Interest Group on Computer Graphics and Interactive Techniques Conference Conference Papers"],
      starts: ["Special Interest Group on Computer Graphics and"] },

    // ---- rows whose official PDF text has a typo or a stray word (kept verbatim in data/):
    //      give the correct spelling so Scholar's strings still match
    { ccf: "Euro-Par", core: "EuroPar", names: ["European Conference on Parallel and Distributed Computing", "Euro-Par", "European Conference on Parallel Processing", "International Euro-Par Conference on Parallel Processing"] },
    { ccf: "MoDELS", names: ["ACM/IEEE International Conference on Model Driven Engineering Languages and Systems"] },
    { ccf: "PG", names: ["Pacific Conference on Computer Graphics and Applications", "Pacific Graphics"] },
    { ccf: "PASTE", names: ["ACM SIGPLAN-SIGSOFT Workshop on Program Analysis for Software Tools and Engineering"] },
    { ccf: "HotStorage", names: ["Hot Topics in Storage and File Systems", "USENIX Workshop on Hot Topics in Storage and File Systems"] },
    { ccf: "JCC", names: ["International Conference on Joint Cloud Computing"] },
    { ccf: "SAC", core: "SAC", noBareAcronym: true, names: ["Selected Areas in Cryptography"] },
    // venues that are, or were, workshops by name, where the list gives the name of today (a string that says "Workshop" is a track at a venue unless it is the venue's own name):
    // `former` names are found by name like any other, but are not the venue's wording otherwise — its "conference" is not a clash with them
    { ccf: "SLT", former: ["IEEE Spoken Language Technology Workshop", "Spoken Language Technology Workshop"] },
    { ccf: "VMCAI", core: "VMCAI", former: ["International Workshop on Verification, Model Checking, and Abstract Interpretation"] },
    { ccf: "SPIN", former: ["International Workshop on Model Checking Software"] },
    { ccf: "CSL", core: "CSL", former: ["International Workshop on Computer Science Logic"] },
    { ccf: "HSCC", former: ["International Workshop on Hybrid Systems: Computation and Control"] },
    { ccf: "CHES", former: ["International Workshop on Cryptographic Hardware and Embedded Systems"] },
    { ccf: "RAID", core: "RAID", former: ["International Workshop on Recent Advances in Intrusion Detection"] },
    { ccf: "MSR", core: "MSR", former: ["International Workshop on Mining Software Repositories"] },
    { ccf: "FSE", ccfTier: "B", former: ["International Workshop on Fast Software Encryption"] },
    { ccf: "PKC", core: "PKC", former: ["International Workshop on Public Key Cryptography", "IACR International Workshop on Public Key Cryptography", "International Workshop on Practice and Theory in Public Key Cryptography"] },
    { ccf: "ICMR", core: "ICMR", former: ["ACM SIGMM International Workshop on Multimedia Information Retrieval"] },
    { core: "CHASE", former: ["International Workshop on Cooperative and Human Aspects of Software Engineering"] },
    { core: "INLG", former: ["International Workshop on Natural Language Generation"] },
    { core: "SSBSE", former: ["International Workshop on Search-Based Software Engineering"] },
    { core: "RSP", former: ["IEEE International Workshop on Rapid System Prototyping"] },
    { core: "HCOMP", former: ["Human Computation Workshop"] },
    { ccf: "PEPM", core: "PEPM", former: ["ACM SIGPLAN Workshop on Partial Evaluation and Semantics-Based Program Manipulation"] },
    { core: "MISE", former: ["International Workshop on Modeling in Software Engineering"] },
    // WACV was the IEEE Workshop on Applications of Computer Vision (CORE still lists that name); it is the Winter Conference, and its workshops are WACVW.
    // (ICML's first decade, "International Workshop on Machine Learning", is not an alias: a title that generic is every sponsor's workshop, and ICML is A*)
    { core: "WACV", renamed: true, exact: ["IEEE/CVF Winter Conference on Applications of Computer Vision", "IEEE Winter Conference on Applications of Computer Vision", "Winter Conference on Applications of Computer Vision"] },          // (exact: the list view's cut "… Applications of Computer …" is the conference or its workshops)
    // names the lists do not give (found by running the names of the 9,000 most-cited conferences and journals of OpenAlex through the matcher)
    { core: "HCW", names: ["Heterogeneous Computing Workshop"] },
    { core: "IECON", names: ["International Conference on Industrial Electronics, Control and Instrumentation"] },
    { core: "ISORC", names: ["IEEE International Symposium on Object/Component/Service-Oriented Real-Time Distributed Computing", "IEEE International Symposium on Object and Component-Oriented Real-Time Distributed Computing", "IEEE International Symposium on Object-Oriented Real-Time Distributed Computing"] },
    { core: "VizSec", former: ["Workshop on Visualization for Computer Security"] },
    { core: "HealthCom", former: ["International Workshop on Enterprise Networking and Computing in Healthcare Industry"] },
    { core: "QoMEX", former: ["International Workshop on Quality of Multimedia Experience"] },
    // earlier or sponsor-carrying names Scholar prints (the lists give the current ones)
    { ccf: "SPAA", core: "SPAA", names: ["ACM Symposium on Parallel Algorithms and Architectures", "Symposium on Parallel Algorithms and Architectures"] },
    // PETS was the International Workshop on Privacy Enhancing Technologies (CORE's note says "of"; the proceedings say "on")
    { core: "PETS", names: ["International Workshop on Privacy Enhancing Technologies"] },
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

    // ---- names Scholar prints that the lists word differently: older or inverted names, singular or plural, a sponsor the list leaves out
    //      (found with the real-profile corpus and the alternate titles OpenAlex files under each conference)
    { core: "JELIA", names: ["European Conference on Logics in Artificial Intelligence", "Joint European Conference on Logics in Artificial Intelligence"] },
    // (joint proceedings, and the title that says "Applications" where CORE says "Application")
    { ccf: "DSN", core: "DSN", names: ["International Conference on Dependable Systems and Networks With FTCS and DCC"] },
    { ccf: "ICCAD", core: "ICCAD", names: ["International Conference on Computer-Aided Design. Digest of Technical Papers"] },
    { core: "ACII", names: ["Humaine Association Conference on Affective Computing and Intelligent Interaction"] },          // (2013's name)
    { core: "CARDIS", names: ["International Conference on Smart Card Research and Advanced Applications", "Smart Card Research and Advanced Applications"] },
    { core: "AIME", names: ["Conference on Artificial Intelligence in Medicine in Europe", "Artificial Intelligence in Medicine in Europe"] },
    // (HiPC was the IEEE's "International Conference on High Performance Computing" before "Data and Analytics" came: with the IEEE only, and not cut off — the bare name is other events', its cut HPCC's)
    { ccf: "HiPC", uncut: ["IEEE International Conference on High Performance Computing"] },
    // (CORE's name begins with its sponsor, ACIS, which is no sponsor to drop: ICIS's is "IEEE/ACIS International Conference on Computer and Information Science")
    { core: "SERA", names: ["International Conference on Software Engineering Research, Management and Applications", "Software Engineering Research, Management and Applications"] },
    { core: "Coordination", names: ["International Conference on Coordination Languages and Models", "Coordination Languages and Models"] },
    { core: "IEEE-IV", names: ["IEEE Intelligent Vehicles Symposium", "Intelligent Vehicles Symposium"] },
    // RTAS before 2003 (the Real-Time and Embedded Technology and Applications Symposium of today)
    { ccf: "RTAS", core: "RTAS", names: ["IEEE Real-Time Technology and Applications Symposium", "Real-Time Technology and Applications Symposium"] },
    { core: "DSD", names: ["Euromicro Conference on Digital System Design", "Euromicro Symposium on Digital System Design"] },
    { ccf: "PAM", core: "PAM", names: ["Passive and Active Network Measurement", "International Conference on Passive and Active Network Measurement"] },
    // IFIP is part of what these say: without it they are any conference on Human-Computer Interaction (HCI International)
    { ccf: "INTERACT", core: "Interact", fullOnly: ["IFIP Conference on Human-Computer Interaction", "IFIP TC13 Conference on Human-Computer Interaction", "IFIP International Conference on Human-Computer Interaction", "IFIP TC13 International Conference on Human-Computer Interaction"] },
    // the cut-off "Proceedings of the International Conference for High Performance Computing …" (the full name goes on with ", Networking, Storage and Analysis")
    { ccf: "SC", core: "SC", starts: ["International Conference for High Performance Computing"] },
    { ccf: "WCNC", core: "WCNC", names: ["IEEE Wireless Communication and Networking Conference"] },
    { core: "SPLC", names: ["International Software Product Line Conference"], exact: ["International Systems and Software Product Line Conference", "ACM International Systems and Software Product Line Conference"],          // (exact: its cut "… Systems and Software …" is SSV's, not SPLC's — "… Systems and Software Product …" is not)
      starts: ["ACM Conference on Systems and Software Product", "ACM International Systems and Software Product", "International Systems and Software Product", "Systems and Software Product"] },
    // ICER was a workshop (CORE's name) until 2013
    { core: "ICER", names: ["International Computing Education Research Conference", "ACM Conference on International Computing Education Research", "ACM Conference on Computing Education Research"] },
    { core: "ACE", names: ["International Conference on Advances in Computer Entertainment Technology"] },
    { core: "SERVICES", exact: ["IEEE World Congress on Services"] },          // (exact: the cut "IEEE World Congress on …" is as much the Congress on Computational Intelligence's)
    { core: "IOLTS", names: ["IEEE International On-Line Testing Symposium", "International On-Line Testing Symposium", "IEEE International Symposium on On-Line Testing"] },
    { core: "TEI", names: ["International Conference on Tangible and Embedded Interaction", "Conference on Tangible and Embedded Interaction"] },
    // ESEM before 2007 (ISESE)
    { ccf: "ESEM", core: "ESEM", names: ["International Symposium on Empirical Software Engineering"] },
    // PROFES until 2011 said "Software Development and Process Improvement"; ACM prints Internetware's title twice ("… Symposium on Internetware on Internetware")
    { core: "PROFES", names: ["International Conference on Product Focused Software Development and Process Improvement"] },
    { core: "ESOP", names: ["European Symposium on Programming Languages and Systems"] },          // (Springer's series title "Programming Languages and Systems" with the symposium's: how Scholar prints ESOP's volumes — two real lines — as it prints APLAS)
    { ccf: "Internetware", names: ["Asia-Pacific Symposium on Internetware on Internetware"] },
    // CCF's name is the one MobiHoc had until 2005 ("Theory, Algorithmic Foundations, and Protocol Design for Mobile Networks and Mobile Computing"); every print says what CORE says
    { ccf: "MobiHoc", core: "MOBIHOC", names: ["ACM International Symposium on Mobile Ad Hoc Networking and Computing", "ACM Symposium on Mobile Ad Hoc Networking and Computing"] },
    { ccf: "CCGRID", core: "CCGRID", names: ["IEEE/ACM International Symposium on Cluster Computing and the Grid", "IEEE International Symposium on Cluster Computing and the Grid", "IEEE/ACM International Symposium on Cluster, Cloud and Internet Computing", "IEEE International Symposium on Cluster, Cloud and Internet Computing"] },
    { core: "COG", names: ["IEEE Conference on Games"] },          // (not its names as CIG: "Computational Intelligence and …" cut off is CIDM's start too)
    { core: "HealthCom", names: ["IEEE International Conference on e-Health Networking, Applications and Services", "IEEE International Conference on E-health Networking, Application & Services"] },
    // (CORE's name has "Model" and "Telecommunications"; the IEEE's prints say "Modeling" or "Modelling" — and a cut "Symposium on Modelling, Analysis and Simulation of …" is not MSWiM, a conference)
    { ccf: "MASCOTS", core: "MASCOTS", names: ["IEEE International Symposium on Modeling, Analysis and Simulation of Computer and Telecommunication Systems", "IEEE International Symposium on Modelling, Analysis and Simulation of Computer and Telecommunication Systems", "IEEE/ACM International Symposium on Modeling, Analysis and Simulation of Computer and Telecommunication Systems", "International Symposium on Modelling, Analysis and Simulation of Computer and Telecommunication Systems", "International Symposium on Modeling, Analysis and Simulation of Computer and Telecommunications Systems"] },
    // the lists word these differently (CCF: the old or the new name, the SIG's own name); the names are each list's own, now on both rows
    { ccf: "GLOBECOM", core: "GLOBECOM", names: ["IEEE Global Communications Conference", "IEEE Global Telecommunications Conference"] },
    { ccf: "FORTE", core: "FORTE", names: ["International Conference on Formal Techniques for Distributed Objects, Components, and Systems", "IFIP Joint International Conference on Formal Description Techniques and Protocol Specification, Testing, And Verification"] },
    { ccf: "APWeb", core: "APWEB", names: ["Asia Pacific Web Conference", "Asia-Pacific Web and Web-Age Information Management Joint International Conference on Web and Big Data"] },
    { ccf: "SIGSPATIAL", core: "SIGSPATIAL", names: ["ACM SIGSPATIAL International Conference on Advances in Geographic Information Systems", "ACM International Conference on Advances in Geographic Information Systems"] },
    { ccf: "MEMOCODE", core: "MEMOCODE", names: ["ACM/IEEE International Conference on Formal Methods and Models for System Design", "ACM/IEEE International Conference on Formal Methods and Models for Codesign"] },
    { ccf: "MASS", core: "MASS", names: ["IEEE International Conference on Mobile Ad-Hoc and Smart Systems", "IEEE International Conference on Mobile Ad Hoc and Smart Systems"] },
    { core: "KES", names: ["International Conference on Knowledge-Based Intelligent Engineering Systems and Allied Technologies"] },
    { ccf: "CODES+ISSS", names: ["IEEE/ACM/IFIP International Conference on Hardware/Software Codesign and System Synthesis", "International Conference on Hardware/Software Codesign and System Synthesis"] },
    { core: "ISADS", names: ["International Symposium on Autonomous Decentralized System"] },
    // CCF's "Computer Graphics Processing" and "Architectures" are the PDF's words; the conferences say "Computer Graphics" and "Compilers, Architecture, and Synthesis"
    { ccf: "CAD/Graphics", names: ["International Conference on Computer-Aided Design and Computer Graphics", "IEEE International Conference on Computer-Aided Design and Computer Graphics"] },
    { ccf: "CASES", names: ["International Conference on Compilers, Architecture, and Synthesis for Embedded Systems"] },
    { ccf: "NAS", names: ["International Conference on Networking, Architecture, and Storage", "IEEE International Conference on Networking, Architecture and Storage"] },
    { core: "ISDA", names: ["International Conference on Intelligent Systems Design and Applications"] },
    { ccf: "IJCB", core: "IJCB", names: ["IEEE International Joint Conference on Biometrics"] },
    { ccf: "COMPSAC", core: "COMPSAC", names: ["IEEE Annual Computers, Software, and Applications Conference", "IEEE International Computer Software and Applications Conference"] },
    { ccf: "ICCD", core: "ICCD", names: ["IEEE International Conference on Computer Design: VLSI in Computers and Processors", "International Conference on Computer Design: VLSI in Computers and Processors"] },
    { core: "BSN", names: ["IEEE International Conference on Wearable and Implantable Body Sensor Networks", "International Workshop on Wearable and Implantable Body Sensor Networks"] },
    { core: "WETICE", names: ["IEEE International Conference on Enabling Technologies: Infrastructure for Collaborative Enterprises", "IEEE International Workshops on Enabling Technologies: Infrastructure for Collaborative Enterprises"] },
    { core: "COMPASS", names: ["ACM SIGCAS Conference on Computing and Sustainable Societies", "ACM SIGCAS/SIGCHI Conference on Computing and Sustainable Societies"] },
    { core: "SNPD", names: ["ACIS International Winter Conference on Software Engineering, Artificial Intelligence, Networking and Parallel/Distributed Computing", "ACIS International Conference on Software Engineering, Artificial Intelligence, Networking and Parallel/Distributed Computing"] },
    { core: "IE", names: ["IET International Conference on Intelligent Environments"] },
    { ccf: "EuroVis", core: "EuroVis", names: ["EG/VGTC Conference on Visualization", "Eurographics/IEEE VGTC Conference on Visualization", "Eurographics/IEEE-VGTC Symposium on Visualization"] },
    { core: "EUSFLAT", names: ["Conference of the European Society for Fuzzy Logic and Technology"] },
    { core: "DCOSS", names: ["International Conference on Distributed Computing in Smart Systems and the Internet of Things", "IEEE International Conference on Distributed Computing in Smart Systems and the Internet of Things", "International Conference on Distributed Computing in Sensor Systems"] },
    { core: "VLSI-SOC", names: ["IFIP International Conference on Very Large Scale Integration", "IEEE/IFIP International Conference on VLSI and System-on-Chip", "IFIP International Conference on VLSI and System-on-Chip"] },
    { core: "HPC Asia", names: ["International Conference on High Performance Computing in Asia-Pacific Region", "International Conference on High Performance Computing in the Asia-Pacific Region"] },
    { core: "VizSec", names: ["IEEE Symposium on Visualization for Cyber Security"] },
    // (second volumes of posters, panels, workshops and demos — see `trackVolume` above)
    { core: "SIGCSE", trackVolume: true },
    { core: "ITiCSE", trackVolume: true },
    { core: "ICER", trackVolume: true },
    { core: "SPLC", trackVolume: true },
    // (ACM titles PPDP's proceedings "… ACM SIGPLAN conference on Principles and practice of declarative programming", a sponsor CORE's name leaves out: without it a cut
    // "… ACM SIGPLAN conference on Principles and practice of …" — PPDP's — saw only CCF's PPoPP, the one venue of either list that names ACM SIGPLAN)
    { core: "PPDP", names: ["ACM SIGPLAN Conference on Principles and Practice of Declarative Programming", "ACM SIGPLAN International Symposium on Principles and Practice of Declarative Programming"] },
    { core: "Broadnets", names: ["International Conference on Broadband Networks", "International Conference on Broadband Communications, Networks and Systems"] },
    { ccf: "ANCS", names: ["ACM/IEEE Symposium on Architectures for Networking and Communications Systems"] },
    { core: "ICSoft", names: ["International Conference on Software Technologies", "International Joint Conference on Software Technologies"] },

    // ---- journals (kind J)
    { ccf: "TOPS", kind: "J", names: ["ACM Transactions on Information and System Security"] },
    // the speech journal of the IEEE Signal Processing Society, under its earlier name (1993–2005)
    { ccf: "TASLP", kind: "J", names: ["IEEE Transactions on Speech and Audio Processing", "IEEE Trans. Speech Audio Process."] },
    // IEEE Transactions on Neural Networks until 2011 (Neural Networks and Learning Systems since)
    { ccf: "TNNLS", kind: "J", names: ["IEEE Transactions on Neural Networks", "IEEE Trans. Neural Networks"] },
    // names the journals had (Bioinformatics was printed with its publisher's city until 2005; Computer Networks, ISDN until 1998; Graphical Models, with Image Processing until 1998; the IEEE's robotics
    // journal was Robotics and Automation until 2003; Frontiers of Computer Science was "in China" until 2010)
    { ccf: "Bioinformatics", kind: "J", names: ["Bioinformatics-Oxford"] },
    { ccf: "CN", kind: "J", names: ["Computer Networks and ISDN Systems"] },
    { ccf: "GMOD", kind: "J", names: ["Graphical Models and Image Processing", "CVGIP: Graphical Models and Image Processing"] },
    { ccf: "TR", kind: "J", names: ["IEEE Transactions on Robotics and Automation", "IEEE Trans. Robotics and Automation"] },
    { ccf: "FCS", kind: "J", names: ["Frontiers of Computer Science in China"] },
    // the parts of the IEEE's Systems, Man and Cybernetics journal (until 2012): Part A is today's Systems, Part B today's Cybernetics (Part B (Cybernetics), with the subtitle in a parenthesis, says too little)
    { ccf: "TSMC", kind: "J", names: ["IEEE Transactions on Systems, Man, and Cybernetics, Part A: Systems and Humans"] },
    { ccf: "IEEE Transactions on Cybernetics", kind: "J", names: ["IEEE Transactions on Systems, Man, and Cybernetics, Part B: Cybernetics"] },
    { ccf: "TCASI", kind: "J", names: ["IEEE Transactions on Circuits and Systems I: Fundamental Theory and Applications"] },          // (until 2003; "Regular Papers" since)
    // the title without the subtitle the list adds: what Elsevier's journals are printed as ("Computational Geometry 1 (1)" — 23 strings of the real profiles)
    { ccf: "JSA", kind: "J", names: ["Journal of Systems Architecture"] },
    { ccf: "CGTA", kind: "J", volume: ["Computational Geometry"] },
    { ccf: "Performance Evaluation: An International Journal", kind: "J", volume: ["Performance Evaluation"] },
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
    // unranked events that a ranked venue's name would otherwise claim (found by running the names of the most-cited conferences through the matcher);
    // JCC is the exception that proves the rule: CCF ranks the JointCloud conference, but the words of "IEEE … Joint Cloud Computing (JCC)" boil down to IEEE CLOUD's — no badge is better than that one
    { shadow: [{ acronym: "ISC", with: "supercomputing" }, { acronym: "ICCC", with: "communications" }, { acronym: "ICCC", with: "cybernetics" }, { acronym: "SPIN", with: "physics" }, { name: "ACM Symposium on Applied Computing" }, { name: "International Conference on Communications" }, { name: "International Conference on Networking" }, { acronym: "BigData", with: "congress" }, { acronym: "ICDM", with: "industrial" }, { name: "Proceedings of the ACM on Computer Graphics and Interactive Techniques" }, "SIGIR-AP", "ICAI", "ICAIE", "SIIE", "ISCTURKEY", "ICONIC", "ICSyS", { acronym: "ICCS", with: "circuits" }, { acronym: "ICCAS", with: "circuits" }, "ANNSIM", { acronym: "MAS", with: "simulation" }, "CISP", "TENSYMP", "ASYU", "CAI", "ICTIR", "ISCISC", "ICCIT", "COMM", "ICNLP", "MODSIM", "ONCON", "IntelliSys", "ICALTE", "ICSOFT-PT", { acronym: "JCC", with: "joint cloud" }, { acronym: "ICICS", with: "communication systems" }, "ICOIN", { acronym: "SOCC", with: "soc conference" }, { acronym: "SOCC", with: "system-on-chip" }] }
  ];
});
