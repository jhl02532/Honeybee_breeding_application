import 'package:flutter/material.dart';
import 'config/app_config.dart';
import 'data/repositories/breeding_repository.dart';
import 'data/models/apiary_model.dart';
import 'data/models/colony_model.dart';
import 'data/models/trait_model.dart';

void main() async {
  // Ensure Flutter engine bindings are initialized for asset loading
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load configuration from assets/config.json (Cloudflare Tunnels or LAN URLs)
  await AppConfig.loadConfig();
  
  runApp(const MelittaMobileApp());
}

class MelittaMobileApp extends StatelessWidget {
  const MelittaMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MelittaBreed Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF121212),
        primaryColor: const Color(0xFFFFC107),
        cardColor: const Color(0xFF1E1E1E),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFFC107),
          secondary: Color(0xFFFFA000),
          surface: Color(0xFF1E1E1E),
        ),
      ),
      home: const MainFieldDashboardScreen(),
    );
  }
}

class MainFieldDashboardScreen extends StatefulWidget {
  const MainFieldDashboardScreen({super.key});

  @override
  State<MainFieldDashboardScreen> createState() => _MainFieldDashboardScreenState();
}

class _MainFieldDashboardScreenState extends State<MainFieldDashboardScreen> {
  final BreedingRepository _repository = BreedingRepository();
  
  bool _isLoading = true;
  int _pendingSyncCount = 0;
  List<ApiaryModel> _apiaries = [];
  List<ColonyModel> _colonies = [];
  Map<String, dynamic> _stats = {
    'total_apiaries': 0,
    'total_colonies': 0,
    'total_records': 0,
    'avg_honey': 0.0,
    'avg_propolis': 0.0,
    'avg_royal_jelly': 0.0,
  };

  ApiaryModel? _selectedApiary;
  ColonyModel? _selectedColony;
  List<TraitRecordModel> _colonyRecords = [];

  // Form Fields for new record
  final _formKey = GlobalKey<FormState>();
  final _honeyController = TextEditingController(text: '0.0');
  final _propolisController = TextEditingController(text: '0.0');
  final _jellyController = TextEditingController(text: '0.0');
  final _tempController = TextEditingController(text: '20.0');
  final _humidityController = TextEditingController(text: '60.0');
  final _notesController = TextEditingController();
  int _temperament = 3;
  int _virusResistance = 3;
  int _miteResistance = 3;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);
    try {
      final apiaries = await _repository.fetchApiaries();
      final stats = await _repository.fetchDashboardStats();
      final pendingCount = await _repository.getPendingSyncCount();
      
      setState(() {
        _apiaries = apiaries;
        _stats = stats;
        _pendingSyncCount = pendingCount;
        if (apiaries.isNotEmpty) {
          _selectedApiary = apiaries.first;
        }
        _isLoading = false;
      });
      if (_selectedApiary != null) {
        _loadColonies(_selectedApiary!.id);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('데이터 로드 오류: 로컬 오프라인 데이터로 가동합니다.');
    }
  }

  Future<void> _loadColonies(int apiaryId) async {
    try {
      final colonies = await _repository.fetchColoniesByApiary(apiaryId);
      setState(() {
        _colonies = colonies;
        _selectedColony = colonies.isNotEmpty ? colonies.first : null;
        _colonyRecords = [];
      });
      if (_selectedColony != null) {
        _loadColonyRecords(_selectedColony!.id);
      }
    } catch (e) {
      _showErrorSnackBar('벌통 데이터 로드 실패');
    }
  }

  Future<void> _loadColonyRecords(int colonyId) async {
    try {
      final records = await _repository.fetchRecordsByColony(colonyId);
      setState(() {
        _colonyRecords = records;
      });
    } catch (e) {
      _showErrorSnackBar('기록 이력 로드 실패');
    }
  }

  Future<void> _saveRecord() async {
    if (_selectedColony == null) return;
    if (!_formKey.currentState!.validate()) return;

    final record = TraitRecordModel(
      colonyId: _selectedColony!.id,
      date: DateTime.now().toIso8601String().substring(0, 10),
      honeyProduction: double.tryParse(_honeyController.text) ?? 0.0,
      propolisProduction: double.tryParse(_propolisController.text) ?? 0.0,
      royalJellyProduction: double.tryParse(_jellyController.text) ?? 0.0,
      temperament: _temperament,
      virusResistance: _virusResistance,
      miteResistance: _miteResistance,
      swarmingRate: 10.0, 
      overwinteringSurvival: 90.0,
      climateAdaptation: 3,
      temperature: double.tryParse(_tempController.text),
      humidity: double.tryParse(_humidityController.text),
      notes: _notesController.text,
    );

    try {
      setState(() => _isLoading = true);
      // Repository attempts remote write, falls back automatically to local Outbox DB on connection loss
      await _repository.registerTraitRecord(record);
      
      _notesController.clear();
      _honeyController.text = '0.0';
      _propolisController.text = '0.0';
      _jellyController.text = '0.0';
      
      // Reload stats and queue count
      final stats = await _repository.fetchDashboardStats();
      final pendingCount = await _repository.getPendingSyncCount();
      
      setState(() {
        _stats = stats;
        _pendingSyncCount = pendingCount;
        _isLoading = false;
      });
      
      if (_selectedColony != null) {
        await _loadColonyRecords(_selectedColony!.id);
      }
      
      if (pendingCount > 0) {
        _showWarningSnackBar('오프라인 감지! 데이터가 기기에 임시 보전되었습니다. (대기: $pendingCount건)');
      } else {
        _showSuccessSnackBar('형질 기록이 중앙 데이터베이스에 동기화 완료되었습니다!');
      }
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('기록 저장 중 치명적 오류 발생');
    }
  }

  Future<void> _executeOutboxSync() async {
    setState(() => _isLoading = true);
    try {
      final successCount = await _repository.executeOutboxSync();
      final pendingCount = await _repository.getPendingSyncCount();
      final stats = await _repository.fetchDashboardStats();
      
      setState(() {
        _pendingSyncCount = pendingCount;
        _stats = stats;
        _isLoading = false;
      });

      if (successCount > 0) {
        _showSuccessSnackBar('동기화 성공! $successCount건의 보류 데이터가 중앙 서버로 업로드되었습니다.');
      } else if (pendingCount > 0) {
        _showWarningSnackBar('서버 연결 실패. 여전히 $pendingCount건의 기록이 오프라인 보존 중입니다.');
      } else {
        _showSuccessSnackBar('동기화할 대기 중인 오프라인 데이터가 없습니다.');
      }

      if (_selectedColony != null) {
        await _loadColonyRecords(_selectedColony!.id);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('동기화 처리 실패: 서버 연결 상태를 확인하세요.');
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  void _showWarningSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.orange, duration: const Duration(seconds: 4)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🐝 MelittaBreed Field Recorder', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E1E1E),
        elevation: 4,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.amber),
            onPressed: _loadInitialData,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.amber))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // --- OFFLINE PENDING BADGE ---
                  if (_pendingSyncCount > 0) _buildOfflineWarningBanner(),
                  const SizedBox(height: 10),

                  // --- INTEGRATED VISUALIZATION STATS ---
                  _buildDashboardStats(),
                  const SizedBox(height: 20),

                  // --- APIARY & COLONY SELECTORS ---
                  _buildSelectors(),
                  const SizedBox(height: 20),

                  // --- DATA RECORDING FORM ---
                  _buildRecordingForm(),
                  const SizedBox(height: 20),

                  // --- RECENT RECORDS HISTORY ---
                  _buildRecordsHistory(),
                ],
              ),
            ),
    );
  }

  Widget _buildOfflineWarningBanner() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.withValues(alpha: 0.15),
        border: Border.all(color: Colors.amber, width: 1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.signal_wifi_off_outlined, color: Colors.amber, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('산간 오지 오프라인 모드 작동 중', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.amber)),
                Text('기기에 저장된 미동기화 기록: $_pendingSyncCount건', style: const TextStyle(fontSize: 12, color: Colors.white70)),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: _executeOutboxSync,
            icon: const Icon(Icons.sync, size: 16, color: Colors.black),
            label: const Text('Wi-Fi 동기화', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              minimumSize: Size.zero,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardStats() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '📊 봉장 통합 현황 대시보드',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.amber),
                ),
                Text('서버: ${AppConfig.baseUrl}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatColumn('총 봉장', _stats['total_apiaries'].toString(), Colors.blueAccent),
                _buildStatColumn('총 벌통', _stats['total_colonies'].toString(), Colors.green),
                _buildStatColumn('총 기록건', _stats['total_records'].toString(), Colors.orange),
              ],
            ),
            const Divider(height: 24, color: Colors.grey),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatColumn('평균 꿀', '${_stats['avg_honey']} Kg', Colors.amber),
                _buildStatColumn('평균 프로폴리스', '${_stats['avg_propolis']} g', Colors.cyan),
                _buildStatColumn('평균 로얄젤리', '${_stats['avg_royal_jelly']} g', Colors.pink),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
        ),
      ],
    );
  }

  Widget _buildSelectors() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('농가 봉장 선택', style: TextStyle(color: Colors.amber, fontSize: 12)),
                  DropdownButton<ApiaryModel>(
                    isExpanded: true,
                    value: _selectedApiary,
                    hint: const Text('봉장 선택'),
                    items: _apiaries.map((apiary) {
                      return DropdownMenuItem<ApiaryModel>(
                        value: apiary,
                        child: Text(apiary.name),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedApiary = val);
                        _loadColonies(val.id);
                      }
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('벌통(봉군) 선택', style: TextStyle(color: Colors.amber, fontSize: 12)),
                  DropdownButton<ColonyModel>(
                    isExpanded: true,
                    value: _selectedColony,
                    hint: const Text('벌통 선택'),
                    items: _colonies.map((colony) {
                      return DropdownMenuItem<ColonyModel>(
                        value: colony,
                        child: Text('${colony.code} (${colony.status})'),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedColony = val);
                        _loadColonyRecords(val.id);
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecordingForm() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '📝 야외 봉장 현장기록기',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.amber),
                  ),
                  if (_selectedColony != null)
                    Chip(
                      label: Text('벌통: ${_selectedColony!.code}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      backgroundColor: Colors.amber.withValues(alpha: 0.2),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Productions Row
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _honeyController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '꿀 채밀량 (Kg)', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? '필수' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _propolisController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '프로폴리스 (g)', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? '필수' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _jellyController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '로얄젤리 (g)', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? '필수' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Weather parameters Row
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _tempController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '봉장 온도 (°C)', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _humidityController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '봉장 습도 (%)', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Sliders for Trait Scores
              _buildSliderRow('온순함 (Score: 1-5)', _temperament, (v) => setState(() => _temperament = v.toInt())),
              _buildSliderRow('바이러스 저항성 (1-5)', _virusResistance, (v) => setState(() => _virusResistance = v.toInt())),
              _buildSliderRow('응애 저항성 (1-5)', _miteResistance, (v) => setState(() => _miteResistance = v.toInt())),
              const SizedBox(height: 12),

              TextFormField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: '검검 및 육종 특이사항', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),

              ElevatedButton.icon(
                onPressed: _selectedColony == null ? null : _saveRecord,
                icon: const Icon(Icons.check_circle_outline, color: Colors.black),
                label: const Text('현장 데이터 전송 (Sync DB)', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.amber,
                  minimumSize: const Size.fromHeight(48),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSliderRow(String title, int value, ValueChanged<double> onChanged) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 13, color: Colors.grey)),
        Row(
          children: [
            Slider(
              value: value.toDouble(),
              min: 1.0,
              max: 5.0,
              divisions: 4,
              activeColor: Colors.amber,
              onChanged: onChanged,
            ),
            Text(value.toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
      ],
    );
  }

  Widget _buildRecordsHistory() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '📈 벌통별 과거 기록 이력 및 추이',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.amber),
            ),
            const SizedBox(height: 12),
            _colonyRecords.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 24.0),
                      child: Text('기록 이력이 없거나 벌통이 선택되지 않았습니다.', style: TextStyle(color: Colors.grey)),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _colonyRecords.length,
                    itemBuilder: (context, index) {
                      final r = _colonyRecords[index];
                      return Card(
                        color: Colors.black26,
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        child: ListTile(
                          title: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('기록일: ${r.date}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              // If it's a mock local unsynced record, show a pending badge!
                              if (r.id == null)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(4)),
                                  child: const Text('동기화 대기', style: TextStyle(fontSize: 10, color: Colors.orangeAccent)),
                                ),
                            ],
                          ),
                          subtitle: Text(
                            '꿀: ${r.honeyProduction}Kg | 프로폴리스: ${r.propolisProduction}g | 온순함: ${r.temperament}점\n기상: ${r.temperature}°C / ${r.humidity}% | 메모: ${r.notes ?? "없음"}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          trailing: const Icon(Icons.analytics_outlined, color: Colors.amberAccent),
                        ),
                      );
                    },
                  ),
          ],
        ),
      ),
    );
  }
}
