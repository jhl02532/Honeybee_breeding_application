class ColonyModel {
  final int id;
  final String code;
  final int apiaryId;
  final String status;
  final String queenTag;

  ColonyModel({
    required this.id,
    required this.code,
    required this.apiaryId,
    required this.status,
    required this.queenTag,
  });

  factory ColonyModel.fromJson(Map<String, dynamic> json) {
    return ColonyModel(
      id: json['id'] as int,
      code: json['code'] as String,
      apiaryId: json['apiary_id'] as int,
      status: json['status'] as String,
      queenTag: json['queen_tag'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'apiary_id': apiaryId,
      'status': status,
      'queen_tag': queenTag,
    };
  }
}
