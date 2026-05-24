class TraitRecordModel {
  final int? id;
  final int colonyId;
  final String date;
  
  // Traits (형질 기록)
  final double honeyProduction;
  final double propolisProduction;
  final double royalJellyProduction;
  final int temperament;
  final int virusResistance;
  final int miteResistance;
  final double swarmingRate;
  final double overwinteringSurvival;
  final int climateAdaptation;

  // Environment (기상 환경 데이터)
  final double? temperature;
  final double? humidity;
  final String? notes;

  TraitRecordModel({
    this.id,
    required this.colonyId,
    required this.date,
    required this.honeyProduction,
    required this.propolisProduction,
    required this.royalJellyProduction,
    required this.temperament,
    required this.virusResistance,
    required this.miteResistance,
    required this.swarmingRate,
    required this.overwinteringSurvival,
    required this.climateAdaptation,
    this.temperature,
    this.humidity,
    this.notes,
  });

  factory TraitRecordModel.fromJson(Map<String, dynamic> json) {
    return TraitRecordModel(
      id: json['id'] as int?,
      colonyId: json['colony_id'] as int,
      date: json['date'] as String,
      honeyProduction: (json['honey_production'] as num).toDouble(),
      propolisProduction: (json['propolis_production'] as num).toDouble(),
      royalJellyProduction: (json['royal_jelly_production'] as num).toDouble(),
      temperament: json['temperament'] as int,
      virusResistance: json['virus_resistance'] as int,
      miteResistance: json['mite_resistance'] as int,
      swarmingRate: (json['swarming_rate'] as num).toDouble(),
      overwinteringSurvival: (json['overwintering_survival'] as num).toDouble(),
      climateAdaptation: json['climate_adaptation'] as int,
      temperature: (json['temperature'] as num?)?.toDouble(),
      humidity: (json['humidity'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'colony_id': colonyId,
      'date': date,
      'honey_production': honeyProduction,
      'propolis_production': propolisProduction,
      'royal_jelly_production': royalJellyProduction,
      'temperament': temperament,
      'virus_resistance': virusResistance,
      'mite_resistance': miteResistance,
      'swarming_rate': swarmingRate,
      'overwintering_survival': overwinteringSurvival,
      'climate_adaptation': climateAdaptation,
      if (temperature != null) 'temperature': temperature,
      if (humidity != null) 'humidity': humidity,
      if (notes != null) 'notes': notes,
    };
  }
}
