// Scholar Lens — background service worker
//
// Resolves venue quality ratings for Google Scholar papers. The content script
// sends { type: 'LOOKUP_VENUE', venue, year }; this worker answers with a
// rating object { core, ccf, sjr, source, matched } where each tier field is
// null or a tier label.
//
// Resolution order, cheapest first:
//   1. chrome.storage.local cache (keyed by normalized venue), fresh < 30 days.
//   2. Bundled CORE/SJR table (VENUES) + bundled CCF 2026 catalog (CCF_RAW) —
//      instant, offline, no network.
//   3. OpenAlex source lookup — derives an SJR-style quartile fallback for
//      journals not in the bundled table.
// Whatever is resolved gets written back to the cache.

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// CCF 2026 catalog. Each entry: [abbr, full, tier, type].
//   tier: "A" | "B" | "C"
//   type: "C" (conference / 会议) | "J" (journal / 期刊)
// abbr may be "" when the source has no abbreviation column.
// Entries are transcribed verbatim; duplicate abbrs across fields are kept.
// ---------------------------------------------------------------------------
const CCF_RAW = [
  // ===================== CONFERENCES (type "C") =====================

  // --- 计算机体系结构/并行与分布计算/存储系统 ---
  ["PPoPP", "ACM SIGPLAN Symposium on Principles & Practice of Parallel Programming", "A", "C"],
  ["FAST", "USENIX Conference on File and Storage Technologies", "A", "C"],
  ["DAC", "Design Automation Conference", "A", "C"],
  ["HPCA", "IEEE International Symposium on High Performance Computer Architecture", "A", "C"],
  ["MICRO", "IEEE/ACM International Symposium on Microarchitecture", "A", "C"],
  ["SC", "International Conference for High Performance Computing, Networking, Storage, and Analysis", "A", "C"],
  ["ASPLOS", "International Conference on Architectural Support for Programming Languages and Operating Systems", "A", "C"],
  ["ISCA", "International Symposium on Computer Architecture", "A", "C"],
  ["ACM SIGOPS ATC", "ACM SIGOPS Annual Technical Conference", "A", "C"],
  ["EuroSys", "European Conference on Computer Systems", "A", "C"],
  ["HPDC", "The International ACM Symposium on High-Performance Parallel and Distributed Computing", "A", "C"],
  ["SoCC", "ACM Symposium on Cloud Computing", "B", "C"],
  ["SPAA", "ACM Symposium on Parallelism in Algorithms and Architectures", "B", "C"],
  ["PODC", "ACM Symposium on Principles of Distributed Computing", "B", "C"],
  ["FPGA", "ACM/SIGDA International Symposium on Field-Programmable Gate Arrays", "B", "C"],
  ["CGO", "The International Symposium on Code Generation and Optimization", "B", "C"],
  ["DATE", "Design, Automation & Test in Europe", "B", "C"],
  ["HOT CHIPS", "Hot Chips: A Symposium on High Performance Chips", "B", "C"],
  ["CLUSTER", "IEEE International Conference on Cluster Computing", "B", "C"],
  ["ICCD", "International Conference on Computer Design", "B", "C"],
  ["ICCAD", "International Conference on Computer-Aided Design", "B", "C"],
  ["ICDCS", "IEEE International Conference on Distributed Computing Systems", "B", "C"],
  ["CODES+ISSS", "International Conference on Hardware/Software Co-design and System Synthesis", "B", "C"],
  ["HiPEAC", "International Conference on High Performance and Embedded Architectures and Compilers", "B", "C"],
  ["SIGMETRICS", "International Conference on Measurement and Modeling of Computer Systems", "B", "C"],
  ["PACT", "International Conference on Parallel Architectures and Compilation Techniques", "B", "C"],
  ["ICPP", "International Conference on Parallel Processing", "B", "C"],
  ["ICS", "International Conference on Supercomputing", "B", "C"],
  ["VEE", "International Conference on Virtual Execution Environments", "B", "C"],
  ["IPDPS", "IEEE International Parallel & Distributed Processing Symposium", "B", "C"],
  ["Performance", "International Symposium on Computer Performance, Modeling, Measurements and Evaluation", "B", "C"],
  ["ITC", "International Test Conference", "B", "C"],
  ["LISA", "Large Installation System Administration Conference", "B", "C"],
  ["MSST", "Mass Storage Systems and Technologies", "B", "C"],
  ["RTAS", "IEEE Real-Time and Embedded Technology and Applications Symposium", "B", "C"],
  ["Euro-Par", "European Conference on Parallel and Distributed Computing", "B", "C"],
  ["ISCAS", "IEEE International Symposium on Circuits and Systems", "B", "C"],
  ["CF", "ACM International Conference on Computing Frontiers", "C", "C"],
  ["SYSTOR", "ACM International Systems and Storage Conference", "C", "C"],
  ["NOCS", "ACM/IEEE International Symposium on Networks-on-Chip", "C", "C"],
  ["ASAP", "IEEE International Conference on Application-Specific Systems, Architectures, and Processors", "C", "C"],
  ["ASP-DAC", "Asia and South Pacific Design Automation Conference", "C", "C"],
  ["ETS", "IEEE European Test Symposium", "C", "C"],
  ["FPL", "International Conference on Field-Programmable Logic and Applications", "C", "C"],
  ["FCCM", "IEEE Symposium on Field-Programmable Custom Computing Machines", "C", "C"],
  ["GLSVLSI", "Great Lakes Symposium on VLSI", "C", "C"],
  ["ATS", "IEEE Asian Test Symposium", "C", "C"],
  ["HPCC", "IEEE International Conference on High Performance Computing and Communications", "C", "C"],
  ["HiPC", "IEEE International Conference on High Performance Computing, Data and Analytics", "C", "C"],
  ["MASCOTS", "International Symposium on Modeling, Analysis, and Simulation of Computer and Telecommunication Systems", "C", "C"],
  ["ISPA", "IEEE International Symposium on Parallel and Distributed Processing with Applications", "C", "C"],
  ["CCGRID", "IEEE/ACM International Symposium on Cluster, Cloud and Grid Computing", "C", "C"],
  ["NPC", "IFIP International Conference on Network and Parallel Computing", "C", "C"],
  ["ICA3PP", "International Conference on Algorithms and Architectures for Parallel Processing", "C", "C"],
  ["CASES", "International Conference on Compilers, Architectures, and Synthesis for Embedded Systems", "C", "C"],
  ["FPT", "International Conference on Field-Programmable Technology", "C", "C"],
  ["ICPADS", "International Conference on Parallel and Distributed Systems", "C", "C"],
  ["ISLPED", "International Symposium on Low Power Electronics and Design", "C", "C"],
  ["ISPD", "International Symposium on Physical Design", "C", "C"],
  ["HOTI", "IEEE Symposium on High-Performance Interconnects", "C", "C"],
  ["VTS", "IEEE VLSI Test Symposium", "C", "C"],
  ["ITC-Asia", "International Test Conference in Asia", "C", "C"],
  ["SEC", "ACM/IEEE Symposium on Edge Computing", "C", "C"],
  ["NAS", "International Conference on Networking, Architecture and Storages", "C", "C"],
  ["HotStorage", "Hot Topics in Storage and File Systems", "C", "C"],
  ["APPT", "International Symposium on Advanced Parallel Processing Technology", "C", "C"],
  ["JCC", "International Conference on Joint Cloud Computing", "C", "C"],

  // --- 计算机网络 ---
  ["SIGCOMM", "ACM International Conference on Applications, Technologies, Architectures, and Protocols for Computer Communication", "A", "C"],
  ["MobiCom", "ACM International Conference on Mobile Computing and Networking", "A", "C"],
  ["INFOCOM", "IEEE International Conference on Computer Communications", "A", "C"],
  ["NSDI", "Symposium on Network System Design and Implementation", "A", "C"],
  ["SenSys", "ACM Conference on Embedded Networked Sensor Systems", "B", "C"],
  ["CoNEXT", "ACM International Conference on emerging Networking EXperiments and Technologies", "B", "C"],
  ["SECON", "IEEE International Conference on Sensing, Communication, and Networking", "B", "C"],
  ["IPSN", "International Conference on Information Processing in Sensor Networks", "B", "C"],
  ["MobiSys", "ACM International Conference on Mobile Systems, Applications, and Services", "B", "C"],
  ["ICNP", "IEEE International Conference on Network Protocols", "B", "C"],
  ["MobiHoc", "International Symposium on Theory, Algorithmic Foundations, and Protocol Design for Mobile Networks and Mobile Computing", "B", "C"],
  ["NOSSDAV", "International Workshop on Network and Operating System Support for Digital Audio and Video", "B", "C"],
  ["IWQoS", "IEEE/ACM International Workshop on Quality of Service", "B", "C"],
  ["IMC", "ACM Internet Measurement Conference", "B", "C"],
  ["ANCS", "ACM/IEEE Symposium on Architectures for Networking and Communication Systems", "C", "C"],
  ["APNOMS", "Asia-Pacific Network Operations and Management Symposium", "C", "C"],
  ["FORTE", "International Conference on Formal Techniques for Distributed Objects, Components, and Systems", "C", "C"],
  ["LCN", "IEEE Conference on Local Computer Networks", "C", "C"],
  ["GLOBECOM", "IEEE Global Communications Conference", "C", "C"],
  ["ICC", "IEEE International Conference on Communications", "C", "C"],
  ["ICCCN", "IEEE International Conference on Computer Communications and Networks", "C", "C"],
  ["MASS", "IEEE International Conference on Mobile Ad-hoc and Sensor Systems", "C", "C"],
  ["P2P", "IEEE International Conference on P2P Computing", "C", "C"],
  ["IPCCC", "IEEE International Performance Computing and Communications Conference", "C", "C"],
  ["WoWMoM", "IEEE International Symposium on a World of Wireless Mobile and Multimedia Networks", "C", "C"],
  ["ISCC", "IEEE Symposium on Computers and Communications", "C", "C"],
  ["WCNC", "IEEE Wireless Communications and Networking Conference", "C", "C"],
  ["Networking", "IFIP International Conferences on Networking", "C", "C"],
  ["IM", "IFIP/IEEE International Symposium on Integrated Network Management", "C", "C"],
  ["MSN", "International Conference on Mobility, Sensing and Networking", "C", "C"],
  ["MSWiM", "International Conference on Modeling, Analysis and Simulation of Wireless and Mobile Systems", "C", "C"],
  ["WASA", "The International Conference on Wireless Artificial Intelligent Computing Systems and Applications", "C", "C"],
  ["HotNets", "ACM The Workshop on Hot Topics in Networks", "C", "C"],
  ["APNet", "Asia-Pacific Workshop on Networking", "C", "C"],

  // --- 网络与信息安全 ---
  ["CCS", "ACM Conference on Computer and Communications Security", "A", "C"],
  ["EUROCRYPT", "International Conference on the Theory and Applications of Cryptographic Techniques", "A", "C"],
  ["S&P", "IEEE Symposium on Security and Privacy", "A", "C"],
  ["CRYPTO", "International Cryptology Conference", "A", "C"],
  ["USENIX Security", "USENIX Security Symposium", "A", "C"],
  ["NDSS", "Network and Distributed System Security Symposium", "A", "C"],
  ["ACSAC", "Annual Computer Security Applications Conference", "B", "C"],
  ["ASIACRYPT", "Annual International Conference on the Theory and Application of Cryptology and Information Security", "B", "C"],
  ["ESORICS", "European Symposium on Research in Computer Security", "B", "C"],
  ["FSE", "Fast Software Encryption", "B", "C"],
  ["CSFW", "IEEE Computer Security Foundations Workshop", "B", "C"],
  ["SRDS", "IEEE International Symposium on Reliable Distributed Systems", "B", "C"],
  ["CHES", "International Conference on Cryptographic Hardware and Embedded Systems", "B", "C"],
  ["DSN", "International Conference on Dependable Systems and Networks", "B", "C"],
  ["RAID", "International Symposium on Recent Advances in Intrusion Detection", "B", "C"],
  ["PKC", "International Workshop on Practice and Theory in Public Key Cryptography", "B", "C"],
  ["TCC", "Theory of Cryptography Conference", "B", "C"],
  ["WiSec", "ACM Conference on Security and Privacy in Wireless and Mobile Networks", "C", "C"],
  ["SACMAT", "ACM Symposium on Access Control Models and Technologies", "C", "C"],
  ["DRM", "ACM Workshop on Digital Rights Management", "C", "C"],
  ["IH&MMSec", "ACM Workshop on Information Hiding and Multimedia Security", "C", "C"],
  ["ACNS", "International Conference on Applied Cryptography and Network Security", "C", "C"],
  ["AsiaCCS", "ACM Asia Conference on Computer and Communications Security", "C", "C"],
  ["ACISP", "Australasia Conference on Information Security and Privacy", "C", "C"],
  ["CT-RSA", "The Cryptographer's Track at RSA Conference", "C", "C"],
  ["DIMVA", "Conference on Detection of Intrusions and Malware & Vulnerability Assessment", "C", "C"],
  ["DFRWS", "Digital Forensic Research Workshop", "C", "C"],
  ["FC", "Financial Cryptography and Data Security", "C", "C"],
  ["TrustCom", "IEEE International Conference on Trust, Security and Privacy in Computing and Communications", "C", "C"],
  ["SEC", "IFIP International Information Security Conference", "C", "C"],
  ["IFIP WG 11.9", "IFIP Working Group 11.9 International Conference on Digital Forensics", "C", "C"],
  ["ISC", "Information Security Conference", "C", "C"],
  ["ICDF2C", "International Conference on Digital Forensics & Cyber Crime", "C", "C"],
  ["ICICS", "International Conference on Information and Communications Security", "C", "C"],
  ["SecureComm", "International Conference on Security and Privacy in Communication Networks", "C", "C"],
  ["NSPW", "New Security Paradigms Workshop", "C", "C"],
  ["PAM", "Passive and Active Measurement Conference", "C", "C"],
  ["PETS", "Privacy Enhancing Technologies Symposium", "C", "C"],
  ["SAC", "Selected Areas in Cryptography", "C", "C"],
  ["SOUPS", "Symposium On Usable Privacy and Security", "C", "C"],
  ["HotSec", "USENIX Workshop on Hot Topics in Security", "C", "C"],
  ["EuroS&P", "IEEE European Symposium on Security and Privacy", "C", "C"],
  ["Inscrypt", "International Conference on Information Security and Cryptology", "C", "C"],
  ["CODASPY", "Conference on Data and Application Security and Privacy", "C", "C"],
  ["BlockSys", "International Conference on Blockchain, Artificial Intelligence, and Trustworthy Systems", "C", "C"],
  ["CSCloud", "International Conference on Cyber Security and Cloud Computing", "C", "C"],

  // --- 软件工程/系统软件/程序设计语言 ---
  ["PLDI", "ACM SIGPLAN Conference on Programming Language Design and Implementation", "A", "C"],
  ["POPL", "ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages", "A", "C"],
  ["FSE", "ACM International Conference on the Foundations of Software Engineering", "A", "C"],
  ["SOSP", "ACM Symposium on Operating Systems Principles", "A", "C"],
  ["OOPSLA", "Conference on Object-Oriented Programming Systems, Languages, and Applications", "A", "C"],
  ["ASE", "International Conference on Automated Software Engineering", "A", "C"],
  ["ICSE", "International Conference on Software Engineering", "A", "C"],
  ["ISSTA", "International Symposium on Software Testing and Analysis", "A", "C"],
  ["OSDI", "USENIX Symposium on Operating Systems Design and Implementation", "A", "C"],
  ["FM", "International Symposium on Formal Methods", "A", "C"],
  ["ECOOP", "European Conference on Object-Oriented Programming", "B", "C"],
  ["ETAPS", "European Joint Conferences on Theory and Practice of Software", "B", "C"],
  ["ICPC", "IEEE International Conference on Program Comprehension", "B", "C"],
  ["RE", "IEEE International Requirements Engineering Conference", "B", "C"],
  ["CAiSE", "International Conference on Advanced Information Systems Engineering", "B", "C"],
  ["ICFP", "ACM SIGPLAN International Conference on Function Programming", "B", "C"],
  ["LCTES", "ACM SIGPLAN/SIGBED International Conference on Languages, Compilers and Tools for Embedded Systems", "B", "C"],
  ["MoDELS", "ACM/IEEE International Conference on Model Driven Engineering Languages and Systems", "B", "C"],
  ["CP", "International Conference on Principles and Practice of Constraint Programming", "B", "C"],
  ["ICSOC", "International Conference on Service Oriented Computing", "B", "C"],
  ["SANER", "IEEE International Conference on Software Analysis, Evolution, and Reengineering", "B", "C"],
  ["ICSME", "International Conference on Software Maintenance and Evolution", "B", "C"],
  ["VMCAI", "International Conference on Verification, Model Checking, and Abstract Interpretation", "B", "C"],
  ["ICWS", "IEEE International Conference on Web Services", "B", "C"],
  ["Middleware", "International Middleware Conference", "B", "C"],
  ["SAS", "International Static Analysis Symposium", "B", "C"],
  ["ESEM", "International Symposium on Empirical Software Engineering and Measurement", "B", "C"],
  ["ISSRE", "IEEE International Symposium on Software Reliability Engineering", "B", "C"],
  ["HotOS", "USENIX Workshop on Hot Topics in Operating Systems", "B", "C"],
  ["CC", "International Conference on Compiler Construction", "B", "C"],
  ["PEPM", "ACM SIGPLAN Workshop on Partial Evaluation and Program Manipulation", "C", "C"],
  ["PASTE", "ACM SIGPLAN-SIGSOFT Workshop on Program Analysis for Software Tools and Engineering", "C", "C"],
  ["APLAS", "Asian Symposium on Programming Languages and Systems", "C", "C"],
  ["APSEC", "Asia-Pacific Software Engineering Conference", "C", "C"],
  ["EASE", "International Conference on Evaluation and Assessment in Software Engineering", "C", "C"],
  ["ICECCS", "International Conference on Engineering of Complex Computer Systems", "C", "C"],
  ["ICST", "IEEE International Conference on Software Testing, Verification and Validation", "C", "C"],
  ["ISPASS", "IEEE International Symposium on Performance Analysis of Systems and Software", "C", "C"],
  ["SCAM", "IEEE International Working Conference on Source Code Analysis and Manipulation", "C", "C"],
  ["COMPSAC", "International Computer Software and Applications Conference", "C", "C"],
  ["ICFEM", "International Conference on Formal Engineering Methods", "C", "C"],
  ["SSE", "IEEE International Conference on Software Services Engineering", "C", "C"],
  ["ICSSP", "International Conference on Software and System Process", "C", "C"],
  ["SEKE", "International Conference on Software Engineering and Knowledge Engineering", "C", "C"],
  ["QRS", "International Conference on Software Quality, Reliability and Security", "C", "C"],
  ["ICSR", "International Conference on Software Reuse", "C", "C"],
  ["ICWE", "International Conference on Web Engineering", "C", "C"],
  ["SPIN", "International Symposium on Model Checking of Software", "C", "C"],
  ["ATVA", "International Symposium on Automated Technology for Verification and Analysis", "C", "C"],
  ["LOPSTR", "International Symposium on Logic-based Program Synthesis and Transformation", "C", "C"],
  ["TASE", "Theoretical Aspects of Software Engineering Conference", "C", "C"],
  ["MSR", "Mining Software Repositories", "C", "C"],
  ["REFSQ", "Requirements Engineering: Foundation for Software Quality", "C", "C"],
  ["WICSA", "Working IEEE/IFIP Conference on Software Architecture", "C", "C"],
  ["Internetware", "Asia-Pacific Symposium on Internetware", "C", "C"],
  ["RV", "International Conference on Runtime Verification", "C", "C"],
  ["MEMOCODE", "International Conference on Formal Methods and Models for Co-Design", "C", "C"],

  // --- 数据库/数据挖掘/内容检索 ---
  ["SIGMOD", "ACM SIGMOD Conference", "A", "C"],
  ["SIGKDD", "ACM SIGKDD Conference on Knowledge Discovery and Data Mining", "A", "C"],
  ["ICDE", "IEEE International Conference on Data Engineering", "A", "C"],
  ["SIGIR", "International ACM SIGIR Conference on Research and Development in Information Retrieval", "A", "C"],
  ["VLDB", "International Conference on Very Large Data Bases", "A", "C"],
  ["CIKM", "ACM International Conference on Information and Knowledge Management", "B", "C"],
  ["WSDM", "ACM International Conference on Web Search and Data Mining", "B", "C"],
  ["PODS", "ACM SIGMOD-SIGACT-SIGAI Symposium on Principles of Database Systems", "B", "C"],
  ["DASFAA", "International Conference on Database Systems for Advanced Applications", "B", "C"],
  ["ECML-PKDD", "European Conference on Machine Learning and Principles and Practice of Knowledge Discovery in Databases", "B", "C"],
  ["ISWC", "IEEE International Semantic Web Conference", "B", "C"],
  ["ICDM", "IEEE International Conference on Data Mining", "B", "C"],
  ["ICDT", "International Conference on Database Theory", "B", "C"],
  ["EDBT", "International Conference on Extending Database Technology", "B", "C"],
  ["CIDR", "Conference on Innovative Data Systems Research", "B", "C"],
  ["SDM", "SIAM International Conference on Data Mining", "B", "C"],
  ["RecSys", "ACM Conference on Recommender Systems", "B", "C"],
  ["WISE", "Web Information Systems Engineering Conference", "B", "C"],
  ["APWeb", "Asia Pacific Web Conference", "C", "C"],
  ["DEXA", "International Conference on Database and Expert System Applications", "C", "C"],
  ["ECIR", "European Conference on Information Retrieval", "C", "C"],
  ["ESWC", "Extended Semantic Web Conference", "C", "C"],
  ["WebDB", "International Workshop on Web and Databases", "C", "C"],
  ["ER", "International Conference on Conceptual Modeling", "C", "C"],
  ["MDM", "International Conference on Mobile Data Management", "C", "C"],
  ["SSDBM", "International Conference on Scientific and Statistical Database Management", "C", "C"],
  ["WAIM", "International Conference on Web Age Information Management", "C", "C"],
  ["SSTD", "International Symposium on Spatial and Temporal Databases", "C", "C"],
  ["PAKDD", "Pacific-Asia Conference on Knowledge Discovery and Data Mining", "C", "C"],
  ["ADMA", "International Conference on Advanced Data Mining and Applications", "C", "C"],
  ["WISA", "Web Information Systems and Applications", "C", "C"],

  // --- 计算机科学理论 ---
  ["STOC", "ACM Symposium on the Theory of Computing", "A", "C"],
  ["SODA", "ACM-SIAM Symposium on Discrete Algorithms", "A", "C"],
  ["CAV", "International Conference on Computer Aided Verification", "A", "C"],
  ["FOCS", "IEEE Annual Symposium on Foundations of Computer Science", "A", "C"],
  ["LICS", "ACM/IEEE Symposium on Logic in Computer Science", "A", "C"],
  ["SoCG", "International Symposium on Computational Geometry", "B", "C"],
  ["ESA", "European Symposium on Algorithms", "B", "C"],
  ["CCC", "Conference on Computational Complexity", "B", "C"],
  ["ICALP", "International Colloquium on Automata, Languages and Programming", "B", "C"],
  ["CADE", "Conference on Automated Deduction", "B", "C"],
  ["CONCUR", "International Conference on Concurrency Theory", "B", "C"],
  ["HSCC", "International Conference on Hybrid Systems: Computation and Control", "B", "C"],
  ["SAT", "International Conference on Theory and Applications of Satisfiability Testing", "B", "C"],
  ["COCOON", "International Computing and Combinatorics Conference", "B", "C"],
  ["FMCAD", "Formal Methods in Computer-Aided Design", "B", "C"],
  ["CSL", "Computer Science Logic", "C", "C"],
  ["FSTTCS", "Foundations of Software Technology and Theoretical Computer Science", "C", "C"],
  ["DSAA", "IEEE International Conference on Data Science and Advanced Analytics", "C", "C"],
  ["ICTAC", "International Colloquium on Theoretical Aspects of Computing", "C", "C"],
  ["IPCO", "International Conference on Integer Programming and Combinatorial Optimization", "C", "C"],
  ["FSCD", "International Conference on Formal Structures for Computation and Deduction", "C", "C"],
  ["ISAAC", "International Symposium on Algorithms and Computation", "C", "C"],
  ["MFCS", "International Conference on Mathematical Foundations of Computer Science", "C", "C"],
  ["STACS", "Symposium on Theoretical Aspects of Computer Science", "C", "C"],
  ["SETTA", "International Symposium on Software Engineering: Theories, Tools, and Applications", "C", "C"],

  // --- 计算机图形学与多媒体 ---
  ["ACM MM", "ACM International Conference on Multimedia", "A", "C"],
  ["SIGGRAPH", "ACM Special Interest Group on Computer Graphics", "A", "C"],
  ["VR", "IEEE Conference on Virtual Reality and 3D User Interfaces", "A", "C"],
  ["IEEE VIS", "IEEE Visualization Conference", "A", "C"],
  ["ICMR", "ACM SIGMM International Conference on Multimedia Retrieval", "B", "C"],
  ["I3D", "ACM SIGGRAPH Symposium on Interactive 3D Graphics and Games", "B", "C"],
  ["SCA", "ACM SIGGRAPH/Eurographics Symposium on Computer Animation", "B", "C"],
  ["DCC", "Data Compression Conference", "B", "C"],
  ["Eurographics", "Annual Conference of the European Association for Computer Graphics", "B", "C"],
  ["EuroVis", "Eurographics Conference on Visualization", "B", "C"],
  ["SGP", "Eurographics Symposium on Geometry Processing", "B", "C"],
  ["EGSR", "Eurographics Symposium on Rendering", "B", "C"],
  ["ICASSP", "IEEE International Conference on Acoustics, Speech and Signal Processing", "B", "C"],
  ["ICME", "IEEE International Conference on Multimedia & Expo", "B", "C"],
  ["ISMAR", "International Symposium on Mixed and Augmented Reality", "B", "C"],
  ["PG", "Pacific Conference on Computer Graphics and Applications", "B", "C"],
  ["SPM", "Symposium on Solid and Physical Modeling", "B", "C"],
  ["INTERSPEECH", "Conference of the International Speech Communication Association", "B", "C"],
  ["VRST", "ACM Symposium on Virtual Reality Software and Technology", "C", "C"],
  ["CASAXR", "International Conference on Computer Animation, Social Agents, and Extended Reality", "C", "C"],
  ["CGI", "Computer Graphics International", "C", "C"],
  ["GMP", "Geometric Modeling and Processing", "C", "C"],
  ["PacificVis", "IEEE Pacific Visualization Symposium", "C", "C"],
  ["3DV", "International Conference on 3D Vision", "C", "C"],
  ["CAD/Graphics", "International Conference on Computer-Aided Design and Computer Graphics", "C", "C"],
  ["ICIP", "IEEE International Conference on Image Processing", "C", "C"],
  ["MMM", "International Conference on Multimedia Modeling", "C", "C"],
  ["MMAsia", "ACM Multimedia Asia", "C", "C"],
  ["SMI", "Shape Modeling International", "C", "C"],
  ["CVM", "Computational Visual Media", "C", "C"],
  ["PRCV", "Chinese Conference on Pattern Recognition and Computer Vision", "C", "C"],
  ["ICIG", "International Conference on Image and Graphics", "C", "C"],
  ["NCMMSC", "National Conference on Man-Machine Speech Communication", "C", "C"],
  ["ASRU", "Automatic Speech Recognition and Understanding Workshop", "C", "C"],
  ["SLT", "Spoken Language Technology", "C", "C"],

  // --- 人工智能 ---
  ["AAAI", "AAAI Conference on Artificial Intelligence", "A", "C"],
  ["NeurIPS", "Conference on Neural Information Processing Systems", "A", "C"],
  ["ACL", "Annual Meeting of the Association for Computational Linguistics", "A", "C"],
  ["CVPR", "IEEE/CVF Computer Vision and Pattern Recognition Conference", "A", "C"],
  ["ICCV", "International Conference on Computer Vision", "A", "C"],
  ["ICML", "International Conference on Machine Learning", "A", "C"],
  ["ICLR", "International Conference on Learning Representations", "A", "C"],
  ["COLT", "Annual Conference on Computational Learning Theory", "B", "C"],
  ["EMNLP", "Conference on Empirical Methods in Natural Language Processing", "B", "C"],
  ["ECAI", "European Conference on Artificial Intelligence", "B", "C"],
  ["ECCV", "European Conference on Computer Vision", "B", "C"],
  ["ICRA", "IEEE International Conference on Robotics and Automation", "B", "C"],
  ["ICAPS", "International Conference on Automated Planning and Scheduling", "B", "C"],
  ["ICCBR", "International Conference on Case-Based Reasoning", "B", "C"],
  ["COLING", "International Conference on Computational Linguistics", "B", "C"],
  ["KR", "International Conference on Principles of Knowledge Representation and Reasoning", "B", "C"],
  ["UAI", "Conference on Uncertainty in Artificial Intelligence", "B", "C"],
  ["AAMAS", "International Joint Conference on Autonomous Agents and Multi-agent Systems", "B", "C"],
  ["PPSN", "Parallel Problem Solving from Nature", "B", "C"],
  ["NAACL", "North American Chapter of the Association for Computational Linguistics", "B", "C"],
  ["IJCAI", "International Joint Conference on Artificial Intelligence", "B", "C"],
  ["AISTATS", "International Conference on Artificial Intelligence and Statistics", "C", "C"],
  ["ACCV", "Asian Conference on Computer Vision", "C", "C"],
  ["ACML", "Asian Conference on Machine Learning", "C", "C"],
  ["BMVC", "British Machine Vision Conference", "C", "C"],
  ["NLPCC", "CCF International Conference on Natural Language Processing and Chinese Computing", "C", "C"],
  ["CoNLL", "Conference on Computational Natural Language Learning", "C", "C"],
  ["GECCO", "Genetic and Evolutionary Computation Conference", "C", "C"],
  ["ICTAI", "IEEE International Conference on Tools with Artificial Intelligence", "C", "C"],
  ["IROS", "IEEE/RSJ International Conference on Intelligent Robots and Systems", "C", "C"],
  ["ALT", "International Conference on Algorithmic Learning Theory", "C", "C"],
  ["ICANN", "International Conference on Artificial Neural Networks", "C", "C"],
  ["FG", "IEEE International Conference on Automatic Face and Gesture Recognition", "C", "C"],
  ["ICDAR", "International Conference on Document Analysis and Recognition", "C", "C"],
  ["ILP", "International Conference on Inductive Logic Programming", "C", "C"],
  ["KSEM", "International conference on Knowledge Science, Engineering and Management", "C", "C"],
  ["ICONIP", "International Conference on Neural Information Processing", "C", "C"],
  ["ICPR", "International Conference on Pattern Recognition", "C", "C"],
  ["IJCB", "International Joint Conference on Biometrics", "C", "C"],
  ["IJCNN", "International Joint Conference on Neural Networks", "C", "C"],
  ["PRICAI", "Pacific Rim International Conference on Artificial Intelligence", "C", "C"],
  ["IEEE CEC", "Congress on Evolutionary Computation", "C", "C"],
  ["DAI", "International Conference on Distributed Artificial Intelligence", "C", "C"],

  // --- 人机交互与普适计算 ---
  ["CSCW", "ACM Conference on Computer Supported Cooperative Work and Social Computing", "A", "C"],
  ["CHI", "ACM Conference on Human Factors in Computing Systems", "A", "C"],
  ["UbiComp", "ACM International Joint Conference on Pervasive and Ubiquitous Computing", "A", "C"],
  ["UIST", "ACM Symposium on User Interface Software and Technology", "A", "C"],
  ["GROUP", "ACM International Conference on Supporting Group Work", "B", "C"],
  ["IUI", "ACM International Conference on Intelligent User Interfaces", "B", "C"],
  ["ISS", "ACM International Conference on Interactive Surfaces and Spaces", "B", "C"],
  ["ECSCW", "European Conference on Computer Supported Cooperative Work", "B", "C"],
  ["PERCOM", "IEEE International Conference on Pervasive Computing and Communications", "B", "C"],
  ["MobileHCI", "ACM International Conference on Mobile Human-Computer Interaction", "B", "C"],
  ["ICWSM", "The International AAAI Conference on Web and Social Media", "B", "C"],
  ["DIS", "ACM SIGCHI Conference on Designing Interactive Systems", "C", "C"],
  ["ICMI", "ACM International Conference on Multimodal Interaction", "C", "C"],
  ["ASSETS", "International ACM SIGACCESS Conference on Computers and Accessibility", "C", "C"],
  ["GI", "Graphics Interface", "C", "C"],
  ["UIC", "IEEE International Conference on Ubiquitous Intelligence and Computing", "C", "C"],
  ["", "IEEE World Haptics Conference", "C", "C"],
  ["INTERACT", "International Conference on Human-Computer Interaction of International Federation for Information Processing", "C", "C"],
  ["IDC", "ACM Interaction Design and Children", "C", "C"],
  ["CollaborateCom", "International Conference on Collaborative Computing: Networking, Applications and Worksharing", "C", "C"],
  ["CSCWD", "International Conference on Computer Supported Cooperative Work in Design", "C", "C"],
  ["CoopIS", "International Conference on Cooperative Information Systems", "C", "C"],
  ["MobiQuitous", "International Conference on Mobile and Ubiquitous Systems: Computing, Networking and Services", "C", "C"],
  ["AVI", "International Working Conference on Advanced Visual Interfaces", "C", "C"],
  ["GPC", "Conference on Green, Pervasive and Cloud Computing", "C", "C"],
  ["ICXR", "CCF International Conference on Extended Reality", "C", "C"],

  // --- 交叉/综合/新兴 ---
  ["WWW", "The Web Conference", "A", "C"],
  ["RTSS", "IEEE Real-Time Systems Symposium", "A", "C"],
  ["CogSci", "Annual Meeting of the Cognitive Science Society", "B", "C"],
  ["BIBM", "IEEE International Conference on Bioinformatics and Biomedicine", "B", "C"],
  ["EMSOFT", "International Conference on Embedded Software", "B", "C"],
  ["ISMB", "International conference on Intelligent Systems for Molecular Biology", "B", "C"],
  ["RECOMB", "Annual International Conference on Research in Computational Molecular Biology", "B", "C"],
  ["MICCAI", "International Conference on Medical Image Computing and Computer-Assisted Intervention", "B", "C"],
  ["WINE", "Conference on Web and Internet Economics", "B", "C"],
  ["AMIA", "American Medical Informatics Association Annual Symposium", "C", "C"],
  ["APBC", "Asia Pacific Bioinformatics Conference", "C", "C"],
  ["IEEE BigData", "IEEE International Conference on Big Data", "C", "C"],
  ["IEEE CLOUD", "IEEE International Conference on Cloud Computing", "C", "C"],
  ["SMC", "IEEE International Conference on Systems, Man, and Cybernetics", "C", "C"],
  ["COSIT", "International Conference on Spatial Information Theory", "C", "C"],
  ["ISBRA", "International Symposium on Bioinformatics Research and Applications", "C", "C"],
  ["SAGT", "International Symposium on Algorithmic Game Theory", "C", "C"],
  ["SIGSPATIAL", "ACM Special Interest Group on Spatial Information", "C", "C"],
  ["ICIC", "International Conference on Intelligent Computing", "C", "C"],
  ["ICSS", "International Conference on Service Science", "C", "C"],
  ["AFT", "Advances in Financial Technologies", "C", "C"],
  ["IJTCS-FAW", "International Joint Conference on Theoretical Computer Science-Frontier of Algorithmic Wisdom", "C", "C"],

  // ===================== JOURNALS (type "J") =====================

  // --- 计算机体系结构/并行与分布计算/存储系统 ---
  ["TOCS", "ACM Transactions on Computer Systems", "A", "J"],
  ["TOS", "ACM Transactions on Storage", "A", "J"],
  ["TCAD", "IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems", "A", "J"],
  ["TC", "IEEE Transactions on Computers", "A", "J"],
  ["TPDS", "IEEE Transactions on Parallel and Distributed Systems", "A", "J"],
  ["TACO", "ACM Transactions on Architecture and Code Optimization", "A", "J"],
  ["TAAS", "ACM Transactions on Autonomous and Adaptive Systems", "B", "J"],
  ["TODAES", "ACM Transactions on Design Automation of Electronic Systems", "B", "J"],
  ["TECS", "ACM Transactions on Embedded Computing Systems", "B", "J"],
  ["TRETS", "ACM Transactions on Reconfigurable Technology and Systems", "B", "J"],
  ["TVLSI", "IEEE Transactions on Very Large Scale Integration (VLSI) Systems", "B", "J"],
  ["JPDC", "Journal of Parallel and Distributed Computing", "B", "J"],
  ["JSA", "Journal of Systems Architecture: Embedded Software Design", "B", "J"],
  ["", "Parallel Computing", "B", "J"],
  ["", "Performance Evaluation: An International Journal", "B", "J"],
  ["TCC", "IEEE Transactions on Cloud Computing", "B", "J"],
  ["JETC", "ACM Journal on Emerging Technologies in Computing Systems", "C", "J"],
  ["", "Concurrency and Computation: Practice and Experience", "C", "J"],
  ["DC", "Distributed Computing", "C", "J"],
  ["FGCS", "Future Generation Computer Systems", "C", "J"],
  ["Integration", "Integration, the VLSI Journal", "C", "J"],
  ["JETTA", "Journal of Electronic Testing-Theory and Applications", "C", "J"],
  ["JGC", "The Journal of Grid computing", "C", "J"],
  ["RTS", "Real-Time Systems", "C", "J"],
  ["TJSC", "The Journal of Supercomputing", "C", "J"],
  ["TCASI", "IEEE Transactions on Circuits and Systems I: Regular Papers", "C", "J"],
  ["CCF-THPC", "CCF Transactions on High Performance Computing", "C", "J"],
  ["TSUSC", "IEEE Transactions on Sustainable Computing", "C", "J"],

  // --- 计算机网络 ---
  ["JSAC", "IEEE Journal on Selected Areas in Communications", "A", "J"],
  ["TMC", "IEEE Transactions on Mobile Computing", "A", "J"],
  ["TON", "IEEE Transactions on Networking", "A", "J"],
  ["TOIT", "ACM Transactions on Internet Technology", "B", "J"],
  ["TOMM", "ACM Transactions on Multimedia Computing, Communications and Applications", "B", "J"],
  ["TOSN", "ACM Transactions on Sensor Networks", "B", "J"],
  ["CN", "Computer Networks", "B", "J"],
  ["TCOM", "IEEE Transactions on Communications", "B", "J"],
  ["TWC", "IEEE Transactions on Wireless Communications", "B", "J"],
  ["", "Ad hoc Networks", "C", "J"],
  ["CC", "Computer Communications", "C", "J"],
  ["TNSM", "IEEE Transactions on Network and Service Management", "C", "J"],
  ["", "IET Communications", "C", "J"],
  ["JNCA", "Journal of Network and Computer Applications", "C", "J"],
  ["MONET", "Mobile Networks and Applications", "C", "J"],
  ["", "Networks", "C", "J"],
  ["PPNA", "Peer-to-Peer Networking and Applications", "C", "J"],
  ["WCMC", "Wireless Communications and Mobile Computing", "C", "J"],
  ["", "Wireless Networks", "C", "J"],
  ["IOT", "IEEE Internet of Things Journal", "C", "J"],
  ["TIOT", "ACM Transactions on Internet of Things", "C", "J"],

  // --- 网络与信息安全 ---
  ["TDSC", "IEEE Transactions on Dependable and Secure Computing", "A", "J"],
  ["TIFS", "IEEE Transactions on Information Forensics and Security", "A", "J"],
  ["", "Journal of Cryptology", "A", "J"],
  ["TOPS", "ACM Transactions on Privacy and Security", "B", "J"],
  ["", "Computers & Security", "B", "J"],
  ["", "Designs, Codes and Cryptography", "B", "J"],
  ["JCS", "Journal of Computer Security", "B", "J"],
  ["Cybersecurity", "Cybersecurity", "B", "J"],
  ["CLSR", "Computer Law & Security Review", "C", "J"],
  ["", "EURASIP Journal on Information Security", "C", "J"],
  ["", "IET Information Security", "C", "J"],
  ["IMCS", "Information and Computer Security", "C", "J"],
  ["IJICS", "International Journal of Information and Computer Security", "C", "J"],
  ["IJISP", "International Journal of Information Security and Privacy", "C", "J"],
  ["JISA", "Journal of Information Security and Applications", "C", "J"],
  ["SCN", "Security and Communication Networks", "C", "J"],
  ["HCC", "High-Confidence Computing", "C", "J"],

  // --- 软件工程/系统软件/程序设计语言 ---
  ["TOPLAS", "ACM Transactions on Programming Languages and Systems", "A", "J"],
  ["TOSEM", "ACM Transactions on Software Engineering and Methodology", "A", "J"],
  ["TSE", "IEEE Transactions on Software Engineering", "A", "J"],
  ["TSC", "IEEE Transactions on Services Computing", "A", "J"],
  ["ASE", "Automated Software Engineering", "B", "J"],
  ["ESE", "Empirical Software Engineering", "B", "J"],
  ["IETS", "IET Software", "B", "J"],
  ["IST", "Information and Software Technology", "B", "J"],
  ["JFP", "Journal of Functional Programming", "B", "J"],
  ["", "Journal of Software: Evolution and Process", "B", "J"],
  ["JSS", "Journal of Systems and Software", "B", "J"],
  ["RE", "Requirements Engineering", "B", "J"],
  ["SCP", "Science of Computer Programming", "B", "J"],
  ["SoSyM", "Software and Systems Modeling", "B", "J"],
  ["STVR", "Software Testing, Verification and Reliability", "B", "J"],
  ["SPE", "Software: Practice and Experience", "B", "J"],
  ["CL", "Computer Languages, Systems and Structures", "C", "J"],
  ["IJSEKE", "International Journal of Software Engineering and Knowledge Engineering", "C", "J"],
  ["STTT", "International Journal of Software Tools for Technology Transfer", "C", "J"],
  ["JLAMP", "Journal of Logical and Algebraic Methods in Programming", "C", "J"],
  ["JWE", "Journal of Web Engineering", "C", "J"],
  ["SOCA", "Service Oriented Computing and Applications", "C", "J"],
  ["SQJ", "Software Quality Journal", "C", "J"],
  ["TPLP", "Theory and Practice of Logic Programming", "C", "J"],
  ["PACM PL", "Proceedings of the ACM on Programming Languages", "C", "J"],

  // --- 数据库/数据挖掘/内容检索 ---
  ["TODS", "ACM Transactions on Database Systems", "A", "J"],
  ["TOIS", "ACM Transactions on Information Systems", "A", "J"],
  ["TKDE", "IEEE Transactions on Knowledge and Data Engineering", "A", "J"],
  ["VLDBJ", "The VLDB Journal", "A", "J"],
  ["TKDD", "ACM Transactions on Knowledge Discovery from Data", "B", "J"],
  ["TWEB", "ACM Transactions on the Web", "B", "J"],
  ["AEI", "Advanced Engineering Informatics", "B", "J"],
  ["DKE", "Data & Knowledge Engineering", "B", "J"],
  ["DMKD", "Data Mining and Knowledge Discovery", "B", "J"],
  ["EJIS", "European Journal of Information Systems", "B", "J"],
  ["", "GeoInformatica", "B", "J"],
  ["IPM", "Information Processing and Management", "B", "J"],
  ["", "Information Sciences", "B", "J"],
  ["IS", "Information Systems", "B", "J"],
  ["JASIST", "Journal of the Association for Information Science and Technology", "B", "J"],
  ["JWS", "Journal of Web Semantics", "B", "J"],
  ["KAIS", "Knowledge and Information Systems", "B", "J"],
  ["DSE", "Data Science and Engineering", "B", "J"],
  ["DPD", "Distributed and Parallel Databases", "C", "J"],
  ["I&M", "Information & Management", "C", "J"],
  ["IPL", "Information Processing Letters", "C", "J"],
  ["", "Discover Computing", "C", "J"],
  ["IJCIS", "International Journal of Cooperative Information Systems", "C", "J"],
  ["IJGIS", "International Journal of Geographical Information Science", "C", "J"],
  ["IJIS", "International Journal of Intelligent Systems", "C", "J"],
  ["IJKM", "International Journal of Knowledge Management", "C", "J"],
  ["IJSWIS", "International Journal on Semantic Web and Information Systems", "C", "J"],
  ["JCIS", "Journal of Computer Information Systems", "C", "J"],
  ["JDM", "Journal of Database Management", "C", "J"],
  ["JGITM", "Journal of Global Information Technology Management", "C", "J"],
  ["JIIS", "Journal of Intelligent Information Systems", "C", "J"],
  ["JSIS", "The Journal of Strategic Information Systems", "C", "J"],
  ["TIST", "ACM Transactions on Intelligent Systems and Technology", "C", "J"],
  ["TORS", "ACM Transactions on Recommender Systems", "C", "J"],

  // --- 计算机科学理论 ---
  ["TIT", "IEEE Transactions on Information Theory", "A", "J"],
  ["IANDC", "Information and Computation", "A", "J"],
  ["SICOMP", "SIAM Journal on Computing", "A", "J"],
  ["TALG", "ACM Transactions on Algorithms", "B", "J"],
  ["TOCL", "ACM Transactions on Computational Logic", "B", "J"],
  ["TOMS", "ACM Transactions on Mathematical Software", "B", "J"],
  ["Algorithmica", "Algorithmica", "B", "J"],
  ["CC", "Computational complexity", "B", "J"],
  ["FAC", "Formal Aspects of Computing", "B", "J"],
  ["FMSD", "Formal Methods in System Design", "B", "J"],
  ["INFORMS", "INFORMS Journal on Computing", "B", "J"],
  ["JCSS", "Journal of Computer and System Sciences", "B", "J"],
  ["JGO", "Journal of Global Optimization", "B", "J"],
  ["JSC", "Journal of Symbolic Computation", "B", "J"],
  ["MSCS", "Mathematical Structures in Computer Science", "B", "J"],
  ["TCS", "Theoretical Computer Science", "B", "J"],
  ["ACTA", "Acta Informatica", "C", "J"],
  ["APAL", "Annals of Pure and Applied Logic", "C", "J"],
  ["DAM", "Discrete Applied Mathematics", "C", "J"],
  ["FUIN", "Fundamenta Informaticae", "C", "J"],
  ["IPL", "Information Processing Letters", "C", "J"],
  ["JCOMPLEXITY", "Journal of Complexity", "C", "J"],
  ["LOGCOM", "Journal of Logic and Computation", "C", "J"],
  ["JSL", "The Journal of Symbolic Logic", "C", "J"],
  ["LMCS", "Logical Methods in Computer Science", "C", "J"],
  ["SIDMA", "SIAM Journal on Discrete Mathematics", "C", "J"],
  ["", "Theory of Computing Systems", "C", "J"],
  ["TQC", "ACM Transactions in Quantum Computing", "C", "J"],

  // --- 计算机图形学与多媒体 ---
  ["TOG", "ACM Transactions on Graphics", "A", "J"],
  ["TIP", "IEEE Transactions on Image Processing", "A", "J"],
  ["TVCG", "IEEE Transactions on Visualization and Computer Graphics", "A", "J"],
  ["TMM", "IEEE Transactions on Multimedia", "A", "J"],
  ["TOMM", "ACM Transactions on Multimedia Computing, Communications and Applications", "B", "J"],
  ["CAGD", "Computer Aided Geometric Design", "B", "J"],
  ["CGF", "Computer Graphics Forum", "B", "J"],
  ["CAD", "Computer-Aided Design", "B", "J"],
  ["TCSVT", "IEEE Transactions on Circuits and Systems for Video Technology", "B", "J"],
  ["JASA", "The Journal of the Acoustical Society of America", "B", "J"],
  ["SIIMS", "SIAM Journal on Imaging Sciences", "B", "J"],
  ["SPECOM", "Speech Communication", "B", "J"],
  ["CVMJ", "Computational Visual Media", "B", "J"],
  ["CGTA", "Computational Geometry: Theory and Applications", "C", "J"],
  ["CAVW", "computer animation & virtual worlds", "C", "J"],
  ["C&G", "Computers & Graphics", "C", "J"],
  ["DCG", "Discrete & Computational Geometry", "C", "J"],
  ["SPL", "IEEE Signal Processing Letters", "C", "J"],
  ["IET-IPR", "IET Image Processing", "C", "J"],
  ["JVCIR", "Journal of Visual Communication and Image Representation", "C", "J"],
  ["MS", "Multimedia Systems", "C", "J"],
  ["MTA", "Multimedia Tools and Applications", "C", "J"],
  ["SIGPRO", "Signal Processing", "C", "J"],
  ["IMAGE", "Signal Processing: Image Communication", "C", "J"],
  ["TVC", "The Visual Computer", "C", "J"],
  ["VI", "Visual Informatics", "C", "J"],
  ["VRIH", "Virtual Reality & Intelligent Hardware", "C", "J"],
  ["GMOD", "Graphical Models", "C", "J"],

  // --- 人工智能 ---
  ["AI", "Artificial Intelligence", "A", "J"],
  ["TPAMI", "IEEE Transactions on Pattern Analysis and Machine Intelligence", "A", "J"],
  ["IJCV", "International Journal of Computer Vision", "A", "J"],
  ["JMLR", "Journal of Machine Learning Research", "A", "J"],
  ["TAP", "ACM Transactions on Applied Perception", "B", "J"],
  ["AAMAS", "Autonomous Agents and Multi-Agent Systems", "B", "J"],
  ["", "Computational Linguistics", "B", "J"],
  ["CVIU", "Computer Vision and Image Understanding", "B", "J"],
  ["DKE", "Data & Knowledge Engineering", "B", "J"],
  ["", "Evolutionary Computation", "B", "J"],
  ["TAC", "IEEE Transactions on Affective Computing", "B", "J"],
  ["TASLP", "IEEE Transactions on Audio, Speech and Language Processing", "B", "J"],
  ["", "IEEE Transactions on Cybernetics", "B", "J"],
  ["TEC", "IEEE Transactions on Evolutionary Computation", "B", "J"],
  ["TFS", "IEEE Transactions on Fuzzy Systems", "B", "J"],
  ["TNNLS", "IEEE Transactions on Neural Networks and learning systems", "B", "J"],
  ["IJAR", "International Journal of Approximate Reasoning", "B", "J"],
  ["JAIR", "Journal of Artificial Intelligence Research", "B", "J"],
  ["", "Journal of Automated Reasoning", "B", "J"],
  ["JSLHR", "Journal of Speech, Language, and Hearing Research", "B", "J"],
  ["", "Machine Learning", "B", "J"],
  ["", "Neural Computation", "B", "J"],
  ["", "Neural Networks", "B", "J"],
  ["PR", "Pattern Recognition", "B", "J"],
  ["TACL", "Transactions of the Association for Computational Linguistics", "B", "J"],
  ["TALLIP", "ACM Transactions on Asian and Low-Resource Language Information Processing", "C", "J"],
  ["", "Applied Intelligence", "C", "J"],
  ["AIM", "Artificial Intelligence in Medicine", "C", "J"],
  ["", "Artificial Life", "C", "J"],
  ["", "Computational Intelligence", "C", "J"],
  ["", "Computer Speech & Language", "C", "J"],
  ["", "Connection Science", "C", "J"],
  ["DSS", "Decision Support Systems", "C", "J"],
  ["EAAI", "Engineering Applications of Artificial Intelligence", "C", "J"],
  ["", "Expert Systems", "C", "J"],
  ["ESWA", "Expert Systems with Applications", "C", "J"],
  ["", "Fuzzy Sets and Systems", "C", "J"],
  ["TG", "IEEE Transactions on Games", "C", "J"],
  ["IET-CVI", "IET Computer Vision", "C", "J"],
  ["", "IET Signal Processing", "C", "J"],
  ["IVC", "Image and Vision Computing", "C", "J"],
  ["IDA", "Intelligent Data Analysis", "C", "J"],
  ["IJCIA", "International Journal of Computational Intelligence and Applications", "C", "J"],
  ["IJIS", "International Journal of Intelligent Systems", "C", "J"],
  ["IJNS", "International Journal of Neural Systems", "C", "J"],
  ["IJPRAI", "International Journal of Pattern Recognition and Artificial Intelligence", "C", "J"],
  ["IJUFKS", "International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems", "C", "J"],
  ["IJDAR", "International Journal on Document Analysis and Recognition", "C", "J"],
  ["JETAI", "Journal of Experimental and Theoretical Artificial Intelligence", "C", "J"],
  ["KBS", "Knowledge-Based Systems", "C", "J"],
  ["", "Machine Translation", "C", "J"],
  ["", "Machine Vision and Applications", "C", "J"],
  ["", "Natural Computing", "C", "J"],
  ["NLE", "Natural Language Engineering", "C", "J"],
  ["NCA", "Neural Computing and Applications", "C", "J"],
  ["NPL", "Neural Processing Letters", "C", "J"],
  ["", "Neurocomputing", "C", "J"],
  ["PAA", "Pattern Analysis and Applications", "C", "J"],
  ["PRL", "Pattern Recognition Letters", "C", "J"],
  ["", "Soft Computing", "C", "J"],
  ["WI", "Web Intelligence", "C", "J"],
  ["TIIS", "ACM Transactions on Interactive Intelligent Systems", "C", "J"],
  ["TELO", "ACM Transactions on Evolutionary Learning and Optimization", "C", "J"],
  ["JATS", "ACM Journal on Autonomous Transportation Systems", "C", "J"],

  // --- 人机交互与普适计算 ---
  ["TOCHI", "ACM Transactions on Computer-Human Interaction", "A", "J"],
  ["IJHCS", "International Journal of Human-Computer Studies", "A", "J"],
  ["CSCW", "Computer Supported Cooperative Work", "B", "J"],
  ["HCI", "Human-Computer Interaction", "B", "J"],
  ["", "IEEE Transactions on Human-Machine Systems", "B", "J"],
  ["IWC", "Interacting with Computers", "B", "J"],
  ["IJHCI", "International Journal of Human-Computer Interaction", "B", "J"],
  ["UMUAI", "User Modeling and User-Adapted Interaction", "B", "J"],
  ["TSMC", "IEEE Transactions on Systems, Man, and Cybernetics: Systems", "B", "J"],
  ["CCF TPCI", "CCF Transactions on Pervasive Computing and Interaction", "B", "J"],
  ["BIT", "Behaviour & Information Technology", "C", "J"],
  ["PUC", "Personal and Ubiquitous Computing", "C", "J"],
  ["PMC", "Pervasive and Mobile Computing", "C", "J"],
  ["PACMHCI", "Proceedings of the ACM on Human-Computer Interaction", "C", "J"],
  ["THRI", "ACM Transactions on Human-Robot Interaction", "C", "J"],

  // --- 交叉/综合/新兴 ---
  ["JACM", "Journal of the ACM", "A", "J"],
  ["Proc. IEEE", "Proceedings of the IEEE", "A", "J"],
  ["SCIS", "Science China Information Sciences", "A", "J"],
  ["Bioinformatics", "Bioinformatics", "A", "J"],
  ["", "Briefings in Bioinformatics", "B", "J"],
  ["Cognition", "Cognition", "B", "J"],
  ["TASAE", "IEEE Transactions on Automation Science and Engineering", "B", "J"],
  ["TGARS", "IEEE Transactions on Geoscience and Remote Sensing", "B", "J"],
  ["TITS", "IEEE Transactions on Intelligent Transportation Systems", "B", "J"],
  ["TMI", "IEEE Transactions on Medical Imaging", "B", "J"],
  ["TR", "IEEE Transactions on Robotics", "B", "J"],
  ["TCBB", "IEEE/ACM Transactions on Computational Biology and Bioinformatics", "B", "J"],
  ["JCST", "Journal of Computer Science and Technology", "B", "J"],
  ["JAMIA", "Journal of the American Medical Informatics Association", "B", "J"],
  ["", "PLOS Computational Biology", "B", "J"],
  ["", "The Computer Journal", "B", "J"],
  ["WWW", "The Web Conference", "B", "J"],
  ["FCS", "Frontiers of Computer Science", "B", "J"],
  ["BCRA", "Blockchain: Research and Applications", "B", "J"],
  ["", "BMC Bioinformatics", "C", "J"],
  ["", "Cybernetics and Systems", "C", "J"],
  ["", "IEEE Geoscience and Remote Sensing Letters", "C", "J"],
  ["JBHI", "IEEE Journal of Biomedical and Health Informatics", "C", "J"],
  ["TBD", "IEEE Transactions on Big Data", "C", "J"],
  ["", "IET Intelligent Transport Systems", "C", "J"],
  ["JBI", "Journal of Biomedical Informatics", "C", "J"],
  ["", "Medical Image Analysis", "C", "J"],
  ["TII", "IEEE Transactions on Industrial Informatics", "C", "J"],
  ["TCPS", "ACM Transactions on Cyber-Physical Systems", "C", "J"],
  ["TOCE", "ACM Transactions on Computing Education", "C", "J"],
  ["EITEE", "ENGINEERING Information Technology & Electronic Engineering", "C", "J"],
  ["TCSS", "IEEE Transactions on Computational Social Systems", "C", "J"],
  ["", "IEEE Transactions on Reliability", "C", "J"],
  ["HEALTH", "ACM Transactions on Computing for Healthcare", "C", "J"],
  ["ACM DLT", "ACM Distributed Ledger Technologies: Research and Practice", "C", "J"]
];

// ---------------------------------------------------------------------------
// Normalization + CCF index (built once at load).
// ---------------------------------------------------------------------------

// Lowercase, strip diacritics, turn `&`/punctuation into spaces, collapse ws.
function normKey(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// byAbbr: normKey(abbr) -> { tier, full }, or null when an abbr maps to >1
// distinct tier (ambiguous → abbr-only matching is skipped for it).
// byName: normKey(full) -> { tier, full } (first wins on rare collisions).
const byAbbr = new Map();
const byName = new Map();
for (const [abbr, full, tier] of CCF_RAW) {
  if (abbr) {
    const k = normKey(abbr);
    if (k) {
      if (byAbbr.has(k)) {
        const prev = byAbbr.get(k);
        if (prev && prev.tier !== tier) byAbbr.set(k, null); // ambiguous
      } else {
        byAbbr.set(k, { tier, full });
      }
    }
  }
  const nk = normKey(full);
  if (nk && !byName.has(nk)) byName.set(nk, { tier, full });
}

// ---------------------------------------------------------------------------
// CACHE_TTL_MS, bundled CORE/SJR table, normalizeVenue, isSecondaryTrack,
// resolveCCF, lookups, message handlers below.
// ---------------------------------------------------------------------------

// Bundled CORE/SJR rankings for well-known CS / ML venues.
// core: CORE conference rank (A*, A, B, C)
// sjr:  SJR journal quartile (Q1..Q4) — set for journals
// Keys are normalized venue names (see normalizeVenue).
const VENUES = {
  // --- Systems / architecture ---
  "isca": { core: "A*" },
  "micro": { core: "A*" },
  "hpca": { core: "A" },
  "asplos": { core: "A*" },
  "sosp": { core: "A*" },
  "osdi": { core: "A*" },
  "usenix atc": { core: "A" },
  "usenix annual technical conference": { core: "A" },
  "eurosys": { core: "A" },
  "fast": { core: "A" },
  "nsdi": { core: "A*" },
  "sigcomm": { core: "A*" },
  "infocom": { core: "A*" },
  "mobicom": { core: "A*" },
  "mobisys": { core: "A" },
  "sensys": { core: "A" },
  "ipsn": { core: "A" },
  "imc": { core: "A" },
  "conext": { core: "A" },

  // --- Software engineering / PL ---
  "icse": { core: "A*" },
  "fse": { core: "A*" },
  "esec/fse": { core: "A*" },
  "ase": { core: "A*" },
  "issta": { core: "A" },
  "pldi": { core: "A*" },
  "popl": { core: "A*" },
  "oopsla": { core: "A" },
  "icfp": { core: "A" },
  "cav": { core: "A*" },
  "tacas": { core: "A" },

  // --- Theory / algorithms ---
  "stoc": { core: "A*" },
  "focs": { core: "A*" },
  "soda": { core: "A*" },
  "icalp": { core: "A" },

  // --- Security ---
  "ccs": { core: "A*" },
  "acm ccs": { core: "A*" },
  "ieee s&p": { core: "A*" },
  "oakland": { core: "A*" },
  "ieee symposium on security and privacy": { core: "A*" },
  "usenix security": { core: "A*" },
  "ndss": { core: "A*" },

  // --- Databases / data mining / IR ---
  "sigmod": { core: "A*" },
  "vldb": { core: "A*" },
  "icde": { core: "A*" },
  "pods": { core: "A*" },
  "kdd": { core: "A*" },
  "sigkdd": { core: "A*" },
  "wsdm": { core: "A*" },
  "icdm": { core: "A*" },
  "cikm": { core: "A" },
  "sigir": { core: "A*" },
  "www": { core: "A*" },
  "the web conference": { core: "A*" },
  "recsys": { core: "A" },
  "edbt": { core: "A" },

  // --- AI / ML ---
  "neurips": { core: "A*" },
  "nips": { core: "A*" },
  "icml": { core: "A*" },
  "iclr": { core: "A*" },
  "aaai": { core: "A*" },
  "ijcai": { core: "A*" },
  "uai": { core: "A" },
  "aistats": { core: "A" },
  "colt": { core: "A" },
  "kdd cup": { core: "A*" },

  // --- Computer vision / graphics ---
  "cvpr": { core: "A*" },
  "iccv": { core: "A*" },
  "eccv": { core: "A*" },
  "siggraph": { core: "A*" },
  "siggraph asia": { core: "A" },
  "bmvc": { core: "A" },
  "wacv": { core: "B" },
  "3dv": { core: "B" },

  // --- NLP / speech ---
  "acl": { core: "A*" },
  "emnlp": { core: "A*" },
  "naacl": { core: "A" },
  "naacl-hlt": { core: "A" },
  "coling": { core: "A" },
  "eacl": { core: "A" },
  "conll": { core: "A" },
  "interspeech": { core: "A" },
  "icassp": { core: "B" },

  // --- HCI / ubicomp / visualization ---
  "chi": { core: "A*" },
  "uist": { core: "A*" },
  "cscw": { core: "A" },
  "ubicomp": { core: "A*" },
  "imwut": { core: "A*" },
  "ieee vis": { core: "A*" },
  "infovis": { core: "A*" },
  "vr": { core: "A" },

  // --- Robotics / control ---
  "icra": { core: "A*" },
  "iros": { core: "A" },
  "rss": { core: "A" },
  "corl": { core: "A" },

  // --- Bioinformatics / misc ---
  "ismb": { core: "A" },
  "recomb": { core: "A" },

  // --- Major journals (SJR quartile, mostly Q1) ---
  "ieee transactions on pattern analysis and machine intelligence": { sjr: "Q1" },
  "tpami": { sjr: "Q1" },
  "international journal of computer vision": { sjr: "Q1" },
  "ijcv": { sjr: "Q1" },
  "journal of machine learning research": { sjr: "Q1" },
  "jmlr": { sjr: "Q1" },
  "communications of the acm": { sjr: "Q1" },
  "ieee transactions on software engineering": { sjr: "Q1" },
  "tse": { sjr: "Q1" },
  "acm transactions on software engineering and methodology": { sjr: "Q1" },
  "tosem": { sjr: "Q1" },
  "ieee transactions on knowledge and data engineering": { sjr: "Q1" },
  "tkde": { sjr: "Q1" },
  "ieee transactions on information theory": { sjr: "Q1" },
  "ieee transactions on networking": { sjr: "Q1" },
  "acm transactions on graphics": { sjr: "Q1" },
  "tog": { sjr: "Q1" },
  "journal of the acm": { sjr: "Q1" },
  "jacm": { sjr: "Q1" },
  "artificial intelligence": { sjr: "Q1" },
  "nature": { sjr: "Q1" },
  "science": { sjr: "Q1" },
  "nature machine intelligence": { sjr: "Q1" },
  "nature communications": { sjr: "Q1" },
  "pnas": { sjr: "Q1" },
  "proceedings of the national academy of sciences": { sjr: "Q1" },
  "bioinformatics": { sjr: "Q1" },
  "plos computational biology": { sjr: "Q1" }
};

// Alternate real-world venue titles that don't reduce, string-wise, to their
// CCF_RAW official full name or their VENUES abbreviation key — e.g. NeurIPS
// papers on Scholar almost always cite the proceedings series title "Advances
// in Neural Information Processing Systems", not the conference's own name
// "Conference on Neural Information Processing Systems". Keys are normKey()'d
// exact full names; values reuse a VENUES rating.
const VENUE_FULL_NAME_ALIASES = {
  "advances in neural information processing systems": VENUES["neurips"]
};

// Exact full-name -> bundled rating index for lookupBundled's fast path,
// built by cross-referencing CCF_RAW's [abbr, full] pairs against VENUES:
// whenever a CCF_RAW abbreviation also has a bundled CORE/SJR rating, its
// full name is registered as an exact alias for that rating. This lets a
// venue string spelled out in full (e.g. "International Conference on
// Machine Learning" instead of "ICML") still resolve to the bundled CORE
// badge, without the risk a generic boilerplate-stripped substring match
// would carry (ICML's stripped core "machine learning" is also a substring
// of the unrelated "Machine Learning" journal's name — see resolveCCF).
const fullNameAliasIndex = new Map();
for (const [abbr, full] of CCF_RAW) {
  if (!abbr) continue;
  const rating = VENUES[normKey(abbr)];
  if (!rating) continue;
  const nk = normKey(full);
  if (!nk) continue;
  if (fullNameAliasIndex.has(nk)) {
    const prev = fullNameAliasIndex.get(nk);
    if (prev && prev !== rating) fullNameAliasIndex.set(nk, null); // ambiguous
  } else {
    fullNameAliasIndex.set(nk, rating);
  }
}
for (const [nk, rating] of Object.entries(VENUE_FULL_NAME_ALIASES)) {
  if (!fullNameAliasIndex.has(nk)) fullNameAliasIndex.set(nk, rating);
}

// Phrases stripped from venue strings before matching, so that
// "Proceedings of the 45th International Conference on Software Engineering"
// reduces toward "software engineering". A standalone `workshop`/`findings`
// token is deliberately preserved (needed by isSecondaryTrack).
function normalizeVenue(raw) {
  if (!raw) return "";
  let v = raw.toLowerCase();
  // Chinese ordinal prefix, e.g. 第45届.
  v = v.replace(/第\s*\d+\s*届/g, " ");
  v = v.replace(/[,;:()\[\].]/g, " ");
  v = v.replace(/\b(19|20)\d{2}\b/g, " ");
  // Ordinals; drop a leading `the` that introduced an ordinal.
  v = v.replace(/\bthe\s+\d+(st|nd|rd|th)\b/g, " ");
  v = v.replace(/\b\d+(st|nd|rd|th)\b/g, " ");
  v = v.replace(/\bproceedings of the\b/g, " ");
  v = v.replace(/\bproceedings of\b/g, " ");
  v = v.replace(/\bproc\.?\b/g, " ");
  v = v.replace(/\bannual\b/g, " ");
  v = v.replace(/\binternational conference on\b/g, " ");
  v = v.replace(/\bconference on\b/g, " ");
  v = v.replace(/\binternational symposium on\b/g, " ");
  v = v.replace(/\bsymposium on\b/g, " ");
  v = v.replace(/\binternational workshop on\b/g, " ");
  v = v.replace(/\bworkshop on\b/g, " ");
  v = v.replace(/\s+/g, " ").trim();
  return v;
}

// Words that, when present in the raw venue but absent from the official full
// name, mark a co-located secondary track rather than the main proceedings.
const SECONDARY_WORDS = [
  "workshop", "companion", "demonstration", "demo",
  "doctoral", "tutorial", "poster", "adjunct"
];

// Return true (→ no badge) for Findings tracks and co-located secondary tracks.
// Venues whose OFFICIAL name itself contains a secondary word (e.g. IWQoS, the
// "International Workshop on Quality of Service") are not excluded, because the
// word also appears in officialFullLower.
function isSecondaryTrack(rawLower, officialFullLower) {
  if (/\bfindings\b/.test(rawLower)) return true;
  for (const w of SECONDARY_WORDS) {
    const re = new RegExp("\\b" + w + "s?\\b");
    if (re.test(rawLower) && !(officialFullLower && re.test(officialFullLower))) {
      return true;
    }
  }
  return false;
}

// Resolve a CCF tier from a raw venue string. Returns "A"|"B"|"C" or null.
// O(1) Map lookups first; a single O(N) scan over CCF_RAW only on miss.
function resolveCCF(raw) {
  const norm = normalizeVenue(raw);
  if (!norm) return null;

  let candidate = null; // { tier, full }

  // (a) Exact full-name match: `byName` is keyed by normKey(full) — lowercased
  // and punctuation-collapsed only, no boilerplate stripped — so the lookup
  // key must be normKey(raw), not `norm` (which has "international conference
  // on"/"proceedings of the Nth"/etc. stripped away). Using `norm` here would
  // reduce distinct venues to the same short string — e.g. both "International
  // Conference on Machine Learning" (ICML) and the unrelated "Machine
  // Learning" journal collapse to "machine learning" — and silently resolve
  // to whichever of the two happens to appear in `byName` under that
  // over-stripped key, misjudging one as the other.
  candidate = byName.get(normKey(raw)) || null;

  // (b) Parenthesized acronym in the RAW string.
  if (!candidate) {
    const m = raw.match(/\(([^)]{2,40})\)/);
    if (m) {
      const hit = byAbbr.get(normKey(m[1]));
      if (hit) candidate = hit;
    }
  }

  // (c) Leading-token acronym.
  if (!candidate) {
    const first = norm.split(" ")[0];
    if (first && first.length >= 2 && first.length <= 12) {
      const hit = byAbbr.get(normKey(first));
      if (hit) candidate = hit;
    }
  }

  // (d) Fallback: one pass over CCF_RAW. Prefer the longest full-name that
  // appears as a whole-token substring of norm; else an abbr word-boundary
  // match (skipping ambiguous abbrs).
  if (!candidate) {
    let bestFull = null;
    let bestLen = 0;
    let abbrHit = null;
    for (const [abbr, full, tier] of CCF_RAW) {
      // Compare against both the raw normalized full name and its
      // boilerplate-stripped form (so "software engineering" matches the
      // official "International Conference on Software Engineering").
      const nf = normKey(full);
      const sf = normalizeVenue(full);
      for (const form of new Set([nf, sf])) {
        if (!form || form.length < bestLen) continue;
        const re = new RegExp("\\b" + form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (!re.test(norm)) continue;
        // On a tie (e.g. a conference's boilerplate-stripped name and an
        // unrelated journal's bare name both reduce to "machine learning"),
        // prefer whichever candidate's own official full name is longer: it
        // took more stripping to reach the same short form, which is stronger
        // evidence that form actually came from *that* full name.
        if (form.length > bestLen || !bestFull || full.length > bestFull.full.length) {
          bestFull = { tier, full };
          bestLen = form.length;
        }
      }
      if (!abbrHit && abbr) {
        const na = normKey(abbr);
        const hit = na && byAbbr.get(na);
        if (hit) {
          const re = new RegExp("\\b" + na.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
          if (re.test(norm)) abbrHit = { tier: hit.tier, full };
        }
      }
    }
    candidate = bestFull || abbrHit;
  }

  if (!candidate) return null;
  if (isSecondaryTrack(raw.toLowerCase(), (candidate.full || "").toLowerCase())) {
    return null;
  }
  return candidate.tier;
}

// Look for a bundled CORE/SJR match: exact normalized key, an exact official
// full-name match, a parenthesized acronym inside the raw string, or a key
// appearing as a token run.
function lookupBundled(rawVenue) {
  const norm = normalizeVenue(rawVenue);
  if (!norm) return null;

  if (VENUES[norm]) return { ...VENUES[norm], source: "bundled", matched: norm };

  const exactFull = fullNameAliasIndex.get(normKey(rawVenue));
  if (exactFull) {
    return { ...exactFull, source: "bundled-full", matched: normKey(rawVenue) };
  }

  const acro = rawVenue.match(/\(([^)]{2,40})\)/);
  if (acro) {
    const a = normalizeVenue(acro[1]);
    if (VENUES[a]) return { ...VENUES[a], source: "bundled", matched: a };
  }

  for (const key of Object.keys(VENUES)) {
    if (key.length < 3) continue;
    const re = new RegExp("\\b" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
    if (re.test(norm)) return { ...VENUES[key], source: "bundled", matched: key };
  }
  return null;
}

async function getCache(key) {
  const store = await chrome.storage.local.get("venueCache");
  const cache = store.venueCache || {};
  const hit = cache[key];
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.value;
  return null;
}

async function setCache(key, value) {
  const store = await chrome.storage.local.get("venueCache");
  const cache = store.venueCache || {};
  cache[key] = { ts: Date.now(), value };
  await chrome.storage.local.set({ venueCache: cache });
}

// Network fallback via OpenAlex. Returns an SJR-style quartile for journals
// when available, otherwise null. Best-effort; failures resolve to null.
async function lookupOpenAlex(rawVenue) {
  const norm = normalizeVenue(rawVenue);
  if (!norm) return null;
  try {
    const url =
      "https://api.openalex.org/sources?search=" +
      encodeURIComponent(norm) +
      "&per-page=1";
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const src = data && data.results && data.results[0];
    if (!src) return null;
    const impact = src.summary_stats && src.summary_stats["2yr_mean_citedness"];
    let sjr = null;
    if (typeof impact === "number") {
      if (impact >= 5) sjr = "Q1";
      else if (impact >= 2.5) sjr = "Q2";
      else if (impact >= 1) sjr = "Q3";
      else sjr = "Q4";
    }
    if (src.type === "journal" && !sjr) sjr = "Q4";
    return sjr ? { sjr, source: "openalex", matched: src.display_name } : null;
  } catch (e) {
    return null;
  }
}

async function resolveVenue(rawVenue) {
  const key = normalizeVenue(rawVenue);
  if (!key) return { core: null, ccf: null, sjr: null, source: "empty", matched: null };

  const cached = await getCache(key);
  if (cached) return cached;

  const secondary = isSecondaryTrack(
    (rawVenue || "").toLowerCase(),
    "" // CORE match has no official full name; Findings/Workshop still excluded
  );

  const bundled = lookupBundled(rawVenue);
  let result = bundled;
  if (!result) result = await lookupOpenAlex(rawVenue);

  const ccf = resolveCCF(rawVenue); // own secondary-track exclusion inside

  const value = {
    // A secondary track (Findings / co-located workshop / demo) gets no CORE badge.
    core: (!secondary && result && result.core) || null,
    ccf: ccf || null,
    sjr: (result && result.sjr) || null,
    source: (result && result.source) || (ccf ? "ccf" : "unknown"),
    matched: (result && result.matched) || null
  };
  await setCache(key, value);
  return value;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "LOOKUP_VENUE") {
    resolveVenue(msg.venue).then(sendResponse);
    return true; // async response
  }
  if (msg && msg.type === "CLEAR_VENUE_CACHE") {
    chrome.storage.local.remove("venueCache").then(() => sendResponse({ ok: true }));
    return true;
  }
});
