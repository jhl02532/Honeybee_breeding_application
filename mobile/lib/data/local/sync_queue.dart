import 'package:dio/dio.dart';
import 'db_helper.dart';
import '../api/api_client.dart';
import '../models/trait_model.dart';

class SyncQueue {
  final DbHelper _dbHelper = DbHelper();
  final ApiClient _apiClient = ApiClient();

  // Syncs all pending local records in local DB to remote FastAPI backend
  Future<int> syncPendingRecords() async {
    final unsynced = await _dbHelper.getUnsyncedRecords();
    if (unsynced.isEmpty) {
      print('[SyncQueue] No pending records to sync.');
      return 0;
    }

    print('[SyncQueue] Found ${unsynced.length} unsynced records. Initiating backup...');
    int successCount = 0;

    for (final row in unsynced) {
      final localId = row['id'] as int;
      
      // Construct a valid API request payload
      final record = TraitRecordModel(
        colonyId: row['colony_id'] as int,
        date: row['date'] as String,
        honeyProduction: row['honey_production'] as double,
        propolisProduction: row['propolis_production'] as double,
        royalJellyProduction: row['royal_jelly_production'] as double,
        temperament: row['temperament'] as int,
        virusResistance: row['virus_resistance'] as int,
        miteResistance: row['mite_resistance'] as int,
        swarmingRate: row['swarming_rate'] as double,
        overwinteringSurvival: row['overwintering_survival'] as double,
        climateAdaptation: row['climate_adaptation'] as int,
        temperature: row['temperature'] as double?,
        humidity: row['humidity'] as double?,
        notes: row['notes'] as String?,
      );

      try {
        // Post directly via Dio client
        final response = await _apiClient.dio.post(
          '/api/v1/traits',
          data: record.toJson(),
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          // Sync successful! Update local DB flag to prevent duplicate uploads
          await _dbHelper.markAsSynced(localId);
          successCount++;
          print('[SyncQueue] Sync success for Local ID $localId -> Remote API');
        }
      } on DioException catch (e) {
        // Network error during transit: stop queue and keep remaining records for next try
        print('[SyncQueue] Sync interrupted at Local ID $localId due to connection loss: ${e.message}');
        break; 
      } catch (e) {
        print('[SyncQueue] Unexpected error syncing record $localId: $e');
        // Continue to other records if it's a specific record format issue
        continue; 
      }
    }

    return successCount;
  }
}
