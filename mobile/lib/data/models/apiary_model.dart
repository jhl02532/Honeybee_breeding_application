class ApiaryModel {
  final int id;
  final String name;
  final String? owner;
  final String? location;
  final double? latitude;
  final double? longitude;

  ApiaryModel({
    required this.id,
    required this.name,
    this.owner,
    this.location,
    this.latitude,
    this.longitude,
  });

  factory ApiaryModel.fromJson(Map<String, dynamic> json) {
    return ApiaryModel(
      id: json['id'] as int,
      name: json['name'] as String,
      owner: json['owner'] as String?,
      location: json['location'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'owner': owner,
      'location': location,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}
