import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/trait_model.dart';

class DbHelper {
  static final DbHelper _instance = DbHelper._internal();
  static Database? _database;

  DbHelper._internal();

  factory DbHelper() => _instance;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final pathString = join(dbPath, 'melitta_offline.db');

    return await openDatabase(
      pathString,
      version: 1,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // local_traits stores pending and synced records in offline situations
    await db.execute('''
      CREATE TABLE local_traits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        colony_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        honey_production REAL,
        propolis_production REAL,
        royal_jelly_production REAL,
        temperament INTEGER,
        virus_resistance INTEGER,
        mite_resistance INTEGER,
        swarming_rate REAL,
        overwintering_survival REAL,
        climate_adaptation INTEGER,
        temperature REAL,
        humidity REAL,
        notes TEXT,
        is_synced INTEGER DEFAULT 0
      )
    ''');
  }

  // --- CRUD LOCAL RECORDS ---
  Future<int> insertLocalTrait(TraitRecordModel record, {int isSynced = 0}) async {
    final db = await database;
    final map = record.toJson();
    map['is_synced'] = isSynced;
    
    // Remote ID doesn't apply to auto-incrementing local SQLite primary key
    map.remove('id'); 
    
    return await db.insert('local_traits', map);
  }

  Future<List<TraitRecordModel>> getLocalRecordsByColony(int colonyId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'local_traits',
      where: 'colony_id = ?',
      whereArgs: [colonyId],
      orderBy: 'date DESC',
    );

    return maps.map((map) => TraitRecordModel.fromJson(map)).toList();
  }

  // Fetch all unsynced outbox records
  Future<List<Map<String, dynamic>>> getUnsyncedRecords() async {
    final db = await database;
    return await db.query('local_traits', where: 'is_synced = 0');
  }

  // Mark specific local record as successfully synced
  Future<int> markAsSynced(int localId) async {
    final db = await database;
    return await db.update(
      'local_traits',
      {'is_synced': 1},
      where: 'id = ?',
      whereArgs: [localId],
    );
  }

  // Count total unsynced records remaining in outbox queue
  Future<int> getUnsyncedCount() async {
    final db = await database;
    final countList = await db.rawQuery('SELECT COUNT(*) FROM local_traits WHERE is_synced = 0');
    return Sqflite.firstIntValue(countList) ?? 0;
  }
}
