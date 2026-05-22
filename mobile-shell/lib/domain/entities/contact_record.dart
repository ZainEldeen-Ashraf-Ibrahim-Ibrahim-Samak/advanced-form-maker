class ContactRecord {
  const ContactRecord({
    required this.id,
    this.name = "",
    this.email,
    this.phone,
    this.contact,
    this.role,
    this.notes,
    this.mediaUrl,
    this.mediaPublicId,
  });

  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? contact;
  final String? role;
  final String? notes;
  final String? mediaUrl;
  final String? mediaPublicId;

  bool get hasAnyMeaningfulValue {
    return name.trim().isNotEmpty ||
        (email?.trim().isNotEmpty ?? false) ||
        (phone?.trim().isNotEmpty ?? false) ||
        (contact?.trim().isNotEmpty ?? false) ||
        (role?.trim().isNotEmpty ?? false) ||
        (notes?.trim().isNotEmpty ?? false) ||
        (mediaUrl?.trim().isNotEmpty ?? false);
  }

  ContactRecord copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? contact,
    String? role,
    String? notes,
    String? mediaUrl,
    String? mediaPublicId,
  }) {
    return ContactRecord(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      contact: contact ?? this.contact,
      role: role ?? this.role,
      notes: notes ?? this.notes,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      mediaPublicId: mediaPublicId ?? this.mediaPublicId,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "id": id,
      "name": name,
      "email": email,
      "phone": phone,
      "contact": contact,
      "role": role,
      "notes": notes,
      "mediaUrl": mediaUrl,
      "mediaPublicId": mediaPublicId,
    };
  }

  factory ContactRecord.fromJson(Map<String, dynamic> json) {
    return ContactRecord(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      email: json["email"]?.toString(),
      phone: json["phone"]?.toString(),
      contact: (json["contact"] ?? json["address"])?.toString(),
      role: json["role"]?.toString(),
      notes: json["notes"]?.toString(),
      mediaUrl: json["mediaUrl"]?.toString(),
      mediaPublicId: json["mediaPublicId"]?.toString(),
    );
  }
}
