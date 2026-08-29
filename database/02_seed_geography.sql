-- =============================================================================
-- Dealer Network Management System — Bangladesh Geography Seed Data
-- File 02 of 03: run this SECOND (after 01_schema.sql).
--
-- Contents:
--   * 8 divisions
--   * 64 districts (with correct division + is_sadar flags)
--   * All upazilas of Bangladesh (with is_sadar flags)
--
-- FK strategy: parent IDs are looked up via unique `code` columns using
-- subqueries, so this works cleanly with the UUID primary keys.
--
-- Code convention:
--   division:  3-letter code            e.g. 'DHA'
--   district:  DIV-DDD                    e.g. 'DHA-DHA'
--   upazila:   DIV-DDD-UU (2-digit seq)   e.g. 'DHA-DHA-01'
-- =============================================================================

-- =============================================================================
-- DIVISIONS (8)
-- =============================================================================
INSERT INTO divisions (name, bn_name, code) VALUES
    ('Dhaka',      'ঢাকা',       'DHA'),
    ('Chattogram', 'চট্টগ্রাম',   'CTG'),
    ('Rajshahi',   'রাজশাহী',    'RAJ'),
    ('Khulna',     'খুলনা',      'KHU'),
    ('Barishal',   'বরিশাল',     'BAR'),
    ('Sylhet',     'সিলেট',      'SYL'),
    ('Rangpur',    'রংপুর',      'RAN'),
    ('Mymensingh', 'ময়মনসিংহ',  'MYM');

-- =============================================================================
-- DISTRICTS (64)
-- is_sadar = TRUE for the district that hosts the divisional HQ.
-- =============================================================================

-- ---- Dhaka Division (13 districts) ----
INSERT INTO districts (division_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM divisions WHERE code='DHA'), 'Dhaka',       'ঢাকা',        'DHA-DHA', TRUE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Gazipur',     'গাজীপুর',     'DHA-GAZ', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Narayanganj', 'নারায়ণগঞ্জ',  'DHA-NAR', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Tangail',     'টাঙ্গাইল',     'DHA-TAN', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Narsingdi',   'নরসিংদী',     'DHA-NRS', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Munshiganj',  'মুন্সিগঞ্জ',    'DHA-MUN', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Manikganj',   'মানিকগঞ্জ',   'DHA-MAN', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Gopalganj',   'গোপালগঞ্জ',   'DHA-GOP', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Madaripur',   'মাদারীপুর',    'DHA-MAD', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Shariatpur',  'শরীয়তপুর',    'DHA-SHA', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Rajbari',     'রাজবাড়ী',     'DHA-RAJ', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Faridpur',    'ফরিদপুর',      'DHA-FAR', FALSE),
    ((SELECT id FROM divisions WHERE code='DHA'), 'Kishoreganj', 'কিশোরগঞ্জ',   'DHA-KIS', FALSE);

-- ---- Chattogram Division (11 districts) ----
INSERT INTO districts (division_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM divisions WHERE code='CTG'), 'Chattogram',    'চট্টগ্রাম',      'CTG-CTG', TRUE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Coxs Bazar',    'কক্সবাজার',     'CTG-COX', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Cumilla',       'কুমিল্লা',       'CTG-CUM', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Brahmanbaria',  'ব্রাহ্মণবাড়িয়া', 'CTG-BRA', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Chandpur',      'চাঁদপুর',       'CTG-CHA', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Feni',          'ফেনী',          'CTG-FEN', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Noakhali',      'নোয়াখালী',     'CTG-NOA', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Lakshmipur',    'লক্ষ্মীপুর',      'CTG-LAK', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Khagrachhari',  'খাগড়াছড়ি',     'CTG-KHA', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Rangamati',     'রাঙ্গামাটি',      'CTG-RAN', FALSE),
    ((SELECT id FROM divisions WHERE code='CTG'), 'Bandarban',     'বান্দরবান',      'CTG-BAN', FALSE);

-- ---- Rajshahi Division (8 districts) ----
INSERT INTO districts (division_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM divisions WHERE code='RAJ'), 'Rajshahi',      'রাজশাহী',      'RAJ-RAJ', TRUE),
    ((SELECT id FROM divisions WHERE code='RAJ'), 'Natore',        'নাটোর',        'RAJ-NAT', FALSE),
    ((SELECT id FROM divisions WHERE code='RAJ'), 'Naogaon',       'নওগাঁ',        'RAJ-NAO', FALSE),
    ((SELECT id FROM divisions WHERE code='RAJ'), 'Chapainawabganj','চাঁপাইনবাবগঞ্জ','RAJ-CHA', FALSE),
    ((SELECT id FROM divisions WHERE code='RAJ'), 'Pabna',         'পাবনা',         'RAJ-PAB', FALSE),
    ((SELECT id FROM divisions WHERE code='RAJ'), 'Bogura',        'বগুড়া',        'RAJ-BOG', FALSE),
    ((SELECT id FROM divisions WHERE code='RAJ'), 'Sirajganj',     'সিরাজগঞ্জ',     'RAJ-SIR', FALSE),
    ((SELECT id FROM divisions WHERE code='RAJ'), 'Joypurhat',     'জয়পুরহাট',     'RAJ-JOY', FALSE);

-- ---- Khulna Division (10 districts) ----
INSERT INTO districts (division_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM divisions WHERE code='KHU'), 'Khulna',        'খুলনা',         'KHU-KHU', TRUE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Bagerhat',      'বাগেরহাট',      'KHU-BAG', FALSE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Satkhira',      'সাতক্ষীরা',      'KHU-SAT', FALSE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Jashore',       'যশোর',          'KHU-JAS', FALSE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Magura',        'মাগুরা',        'KHU-MAG', FALSE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Jhenaidah',     'ঝিনাইদহ',       'KHU-JHE', FALSE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Narail',        'নড়াইল',        'KHU-NAR', FALSE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Kushtia',       'কুষ্টিয়া',       'KHU-KUS', FALSE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Chuadanga',     'চুয়াডাঙ্গা',     'KHU-CHU', FALSE),
    ((SELECT id FROM divisions WHERE code='KHU'), 'Meherpur',      'মেহেরপুর',      'KHU-MEH', FALSE);

-- ---- Barishal Division (6 districts) ----
INSERT INTO districts (division_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM divisions WHERE code='BAR'), 'Barishal',      'বরিশাল',        'BAR-BAR', TRUE),
    ((SELECT id FROM divisions WHERE code='BAR'), 'Patuakhali',    'পটুয়াখালী',     'BAR-PAT', FALSE),
    ((SELECT id FROM divisions WHERE code='BAR'), 'Bhola',         'ভোলা',          'BAR-BHO', FALSE),
    ((SELECT id FROM divisions WHERE code='BAR'), 'Pirojpur',      'পিরোজপুর',      'BAR-PIR', FALSE),
    ((SELECT id FROM divisions WHERE code='BAR'), 'Barguna',       'বরগুনা',        'BAR-BRG', FALSE),
    ((SELECT id FROM divisions WHERE code='BAR'), 'Jhalokati',     'ঝালকাঠি',       'BAR-JHA', FALSE);

-- ---- Sylhet Division (4 districts) ----
INSERT INTO districts (division_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM divisions WHERE code='SYL'), 'Sylhet',        'সিলেট',         'SYL-SYL', TRUE),
    ((SELECT id FROM divisions WHERE code='SYL'), 'Moulvibazar',   'মৌলভীবাজার',    'SYL-MOU', FALSE),
    ((SELECT id FROM divisions WHERE code='SYL'), 'Habiganj',      'হবিগঞ্জ',       'SYL-HAB', FALSE),
    ((SELECT id FROM divisions WHERE code='SYL'), 'Sunamganj',     'সুনামগঞ্জ',      'SYL-SUN', FALSE);

-- ---- Rangpur Division (8 districts) ----
INSERT INTO districts (division_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM divisions WHERE code='RAN'), 'Rangpur',       'রংপুর',         'RAN-RAN', TRUE),
    ((SELECT id FROM divisions WHERE code='RAN'), 'Dinajpur',      'দিনাজপুর',      'RAN-DIN', FALSE),
    ((SELECT id FROM divisions WHERE code='RAN'), 'Kurigram',      'কুড়িগ্রাম',      'RAN-KUR', FALSE),
    ((SELECT id FROM divisions WHERE code='RAN'), 'Gaibandha',     'গাইবান্ধা',      'RAN-GAI', FALSE),
    ((SELECT id FROM divisions WHERE code='RAN'), 'Nilphamari',    'নীলফামারী',     'RAN-NIL', FALSE),
    ((SELECT id FROM divisions WHERE code='RAN'), 'Panchagarh',    'পঞ্চগড়',        'RAN-PAN', FALSE),
    ((SELECT id FROM divisions WHERE code='RAN'), 'Thakurgaon',    'ঠাকুরগাঁও',      'RAN-THA', FALSE),
    ((SELECT id FROM divisions WHERE code='RAN'), 'Lalmonirhat',   'লালমনিরহাট',    'RAN-LAL', FALSE);

-- ---- Mymensingh Division (4 districts) ----
INSERT INTO districts (division_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM divisions WHERE code='MYM'), 'Mymensingh',    'ময়মনসিংহ',     'MYM-MYM', TRUE),
    ((SELECT id FROM divisions WHERE code='MYM'), 'Jamalpur',      'জামালপুর',      'MYM-JAM', FALSE),
    ((SELECT id FROM divisions WHERE code='MYM'), 'Sherpur',       'শেরপুর',        'MYM-SHE', FALSE),
    ((SELECT id FROM divisions WHERE code='MYM'), 'Netrokona',     'নেত্রকোনা',      'MYM-NET', FALSE);

-- =============================================================================
-- UPAZILAS
-- Each district's sadar (headquarters) upazila is flagged is_sadar = TRUE.
-- Metropolitan/city thanas are represented by the district Sadar where a
-- distinct rural sadar upazila does not exist.
-- =============================================================================

-- ========================= DHAKA DIVISION =========================

-- Dhaka district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-DHA'), 'Dhaka Sadar',   'ঢাকা সদর',    'DHA-DHA-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-DHA'), 'Savar',         'সাভার',       'DHA-DHA-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-DHA'), 'Dhamrai',       'ধামরাই',      'DHA-DHA-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-DHA'), 'Keraniganj',    'কেরানীগঞ্জ',  'DHA-DHA-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-DHA'), 'Nawabganj',     'নবাবগঞ্জ',    'DHA-DHA-05', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-DHA'), 'Dohar',         'দোহার',       'DHA-DHA-06', FALSE);

-- Gazipur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-GAZ'), 'Gazipur Sadar', 'গাজীপুর সদর', 'DHA-GAZ-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-GAZ'), 'Kaliakair',     'কালিয়াকৈর',  'DHA-GAZ-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-GAZ'), 'Kapasia',       'কাপাসিয়া',   'DHA-GAZ-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-GAZ'), 'Sreepur',       'শ্রীপুর',      'DHA-GAZ-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-GAZ'), 'Kaliganj',      'কালীগঞ্জ',    'DHA-GAZ-05', FALSE);

-- Narayanganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-NAR'), 'Narayanganj Sadar','নারায়ণগঞ্জ সদর','DHA-NAR-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-NAR'), 'Araihazar',     'আড়াইহাজার',   'DHA-NAR-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-NAR'), 'Bandar',        'বন্দর',        'DHA-NAR-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-NAR'), 'Rupganj',       'রূপগঞ্জ',      'DHA-NAR-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-NAR'), 'Sonargaon',     'সোনারগাঁও',    'DHA-NAR-05', FALSE);

-- Tangail district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Tangail Sadar', 'টাঙ্গাইল সদর', 'DHA-TAN-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Sakhipur',      'সখীপুর',       'DHA-TAN-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Basail',        'বাসাইল',       'DHA-TAN-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Madhupur',      'মধুপুর',       'DHA-TAN-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Ghatail',       'ঘাটাইল',       'DHA-TAN-05', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Kalihati',      'কালিহাতী',     'DHA-TAN-06', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Nagarpur',      'নাগরপুর',      'DHA-TAN-07', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Mirzapur',      'মির্জাপুর',     'DHA-TAN-08', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Gopalpur',      'গোপালপুর',     'DHA-TAN-09', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Delduar',       'দেলদুয়ার',     'DHA-TAN-10', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Bhuapur',       'ভুয়াপুর',      'DHA-TAN-11', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-TAN'), 'Dhanbari',      'ধনবাড়ী',      'DHA-TAN-12', FALSE);

-- Narsingdi district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-NRS'), 'Narsingdi Sadar','নরসিংদী সদর','DHA-NRS-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-NRS'), 'Belabo',        'বেলাবো',       'DHA-NRS-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-NRS'), 'Monohardi',     'মনোহরদী',     'DHA-NRS-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-NRS'), 'Palash',        'পলাশ',         'DHA-NRS-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-NRS'), 'Raipura',       'রায়পুরা',      'DHA-NRS-05', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-NRS'), 'Shibpur',       'শিবপুর',       'DHA-NRS-06', FALSE);

-- Munshiganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-MUN'), 'Munshiganj Sadar','মুন্সিগঞ্জ সদর','DHA-MUN-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-MUN'), 'Sreenagar',     'শ্রীনগর',      'DHA-MUN-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MUN'), 'Sirajdikhan',   'সিরাজদিখান',   'DHA-MUN-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MUN'), 'Louhajang',     'লৌহজং',        'DHA-MUN-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MUN'), 'Gazaria',       'গজারিয়া',      'DHA-MUN-05', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MUN'), 'Tongibari',     'টঙ্গিবাড়ী',     'DHA-MUN-06', FALSE);

-- Manikganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-MAN'), 'Manikganj Sadar','মানিকগঞ্জ সদর','DHA-MAN-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-MAN'), 'Singair',       'সিংগাইর',      'DHA-MAN-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MAN'), 'Shibalaya',     'শিবালয়',       'DHA-MAN-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MAN'), 'Saturia',       'সাটুরিয়া',     'DHA-MAN-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MAN'), 'Harirampur',    'হরিরামপুর',    'DHA-MAN-05', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MAN'), 'Ghior',         'ঘিওর',         'DHA-MAN-06', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MAN'), 'Daulatpur',     'দৌলতপুর',      'DHA-MAN-07', FALSE);

-- Gopalganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-GOP'), 'Gopalganj Sadar','গোপালগঞ্জ সদর','DHA-GOP-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-GOP'), 'Kashiani',      'কাশিয়ানী',    'DHA-GOP-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-GOP'), 'Tungipara',     'টুংগীপাড়া',    'DHA-GOP-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-GOP'), 'Kotalipara',    'কোটালীপাড়া',  'DHA-GOP-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-GOP'), 'Muksudpur',     'মুকসুদপুর',    'DHA-GOP-05', FALSE);

-- Madaripur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-MAD'), 'Madaripur Sadar','মাদারীপুর সদর','DHA-MAD-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-MAD'), 'Shibchar',      'শিবচর',        'DHA-MAD-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MAD'), 'Kalkini',       'কালকিনি',      'DHA-MAD-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MAD'), 'Rajoir',        'রাজৈর',        'DHA-MAD-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-MAD'), 'Dasar',         'ডাসার',        'DHA-MAD-05', FALSE);

-- Shariatpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-SHA'), 'Shariatpur Sadar','শরীয়তপুর সদর','DHA-SHA-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-SHA'), 'Naria',         'নড়িয়া',       'DHA-SHA-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-SHA'), 'Zajira',        'জাজিরা',       'DHA-SHA-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-SHA'), 'Gosairhat',     'গোসাইরহাট',    'DHA-SHA-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-SHA'), 'Bhedarganj',    'ভেদরগঞ্জ',     'DHA-SHA-05', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-SHA'), 'Damudya',       'ডামুড্যা',      'DHA-SHA-06', FALSE);

-- Rajbari district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-RAJ'), 'Rajbari Sadar', 'রাজবাড়ী সদর', 'DHA-RAJ-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-RAJ'), 'Goalanda',      'গোয়ালন্দ',     'DHA-RAJ-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-RAJ'), 'Pangsha',       'পাংশা',        'DHA-RAJ-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-RAJ'), 'Baliakandi',    'বালিয়াকান্দি',  'DHA-RAJ-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-RAJ'), 'Kalukhali',     'কালুখালী',     'DHA-RAJ-05', FALSE);

-- Faridpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Faridpur Sadar','ফরিদপুর সদর','DHA-FAR-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Boalmari',      'বোয়ালমারী',   'DHA-FAR-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Alfadanga',     'আলফাডাঙ্গা',   'DHA-FAR-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Madhukhali',    'মধুখালী',      'DHA-FAR-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Bhanga',        'ভাঙ্গা',        'DHA-FAR-05', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Nagarkanda',    'নগরকান্দা',    'DHA-FAR-06', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Charbhadrasan', 'চরভদ্রাসন',    'DHA-FAR-07', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Sadarpur',      'সদরপুর',       'DHA-FAR-08', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-FAR'), 'Saltha',        'সালথা',        'DHA-FAR-09', FALSE);

-- Kishoreganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Kishoreganj Sadar','কিশোরগঞ্জ সদর','DHA-KIS-01', TRUE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Itna',          'ইটনা',         'DHA-KIS-02', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Katiadi',       'কটিয়াদী',      'DHA-KIS-03', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Bhairab',       'ভৈরব',         'DHA-KIS-04', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Tarail',        'তাড়াইল',       'DHA-KIS-05', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Hossainpur',    'হোসেনপুর',     'DHA-KIS-06', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Pakundia',      'পাকুন্দিয়া',    'DHA-KIS-07', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Kuliarchar',    'কুলিয়ারচর',    'DHA-KIS-08', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Karimganj',     'করিমগঞ্জ',     'DHA-KIS-09', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Bajitpur',      'বাজিতপুর',     'DHA-KIS-10', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Austagram',     'অষ্টগ্রাম',     'DHA-KIS-11', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Mithamain',     'মিঠামইন',      'DHA-KIS-12', FALSE),
    ((SELECT id FROM districts WHERE code='DHA-KIS'), 'Nikli',         'নিকলী',        'DHA-KIS-13', FALSE);

-- ========================= CHATTOGRAM DIVISION =========================

-- Chattogram district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Chattogram Sadar','চট্টগ্রাম সদর','CTG-CTG-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Rangunia',      'রাঙ্গুনিয়া',     'CTG-CTG-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Sitakunda',     'সীতাকুণ্ড',     'CTG-CTG-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Mirsharai',     'মীরসরাই',      'CTG-CTG-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Patiya',        'পটিয়া',        'CTG-CTG-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Sandwip',       'সন্দ্বীপ',       'CTG-CTG-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Banshkhali',    'বাঁশখালী',     'CTG-CTG-07', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Boalkhali',     'বোয়ালখালী',   'CTG-CTG-08', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Anwara',        'আনোয়ারা',     'CTG-CTG-09', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Chandanaish',   'চন্দনাইশ',     'CTG-CTG-10', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Satkania',      'সাতকানিয়া',   'CTG-CTG-11', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Lohagara',      'লোহাগাড়া',    'CTG-CTG-12', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Hathazari',     'হাটহাজারী',    'CTG-CTG-13', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Fatikchhari',   'ফটিকছড়ি',     'CTG-CTG-14', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Raozan',        'রাউজান',       'CTG-CTG-15', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CTG'), 'Karnaphuli',    'কর্ণফুলী',      'CTG-CTG-16', FALSE);

-- Coxs Bazar district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-COX'), 'Coxs Bazar Sadar','কক্সবাজার সদর','CTG-COX-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-COX'), 'Chakaria',      'চকরিয়া',       'CTG-COX-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-COX'), 'Kutubdia',      'কুতুবদিয়া',     'CTG-COX-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-COX'), 'Ukhia',         'উখিয়া',        'CTG-COX-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-COX'), 'Moheshkhali',   'মহেশখালী',     'CTG-COX-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-COX'), 'Pekua',         'পেকুয়া',       'CTG-COX-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-COX'), 'Ramu',          'রামু',          'CTG-COX-07', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-COX'), 'Teknaf',        'টেকনাফ',       'CTG-COX-08', FALSE);

-- Cumilla district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Cumilla Sadar', 'কুমিল্লা সদর',  'CTG-CUM-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Debidwar',      'দেবিদ্বার',      'CTG-CUM-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Barura',        'বরুড়া',        'CTG-CUM-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Brahmanpara',   'ব্রাহ্মণপাড়া',   'CTG-CUM-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Chandina',      'চান্দিনা',       'CTG-CUM-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Chauddagram',   'চৌদ্দগ্রাম',     'CTG-CUM-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Daudkandi',     'দাউদকান্দি',    'CTG-CUM-07', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Homna',         'হোমনা',        'CTG-CUM-08', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Laksam',        'লাকসাম',       'CTG-CUM-09', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Muradnagar',    'মুরাদনগর',     'CTG-CUM-10', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Nangalkot',     'নাঙ্গলকোট',     'CTG-CUM-11', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Cumilla Adarsha Sadar','কুমিল্লা আদর্শ সদর','CTG-CUM-12', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Meghna',        'মেঘনা',        'CTG-CUM-13', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Monohorgonj',   'মনোহরগঞ্জ',    'CTG-CUM-14', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Titas',         'তিতাস',         'CTG-CUM-15', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Burichang',     'বুড়িচং',       'CTG-CUM-16', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CUM'), 'Lalmai',        'লালমাই',       'CTG-CUM-17', FALSE);

-- Brahmanbaria district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Brahmanbaria Sadar','ব্রাহ্মণবাড়িয়া সদর','CTG-BRA-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Kasba',         'কসবা',         'CTG-BRA-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Nasirnagar',    'নাসিরনগর',     'CTG-BRA-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Sarail',        'সরাইল',        'CTG-BRA-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Ashuganj',      'আশুগঞ্জ',      'CTG-BRA-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Akhaura',       'আখাউড়া',      'CTG-BRA-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Nabinagar',     'নবীনগর',       'CTG-BRA-07', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Bancharampur',  'বাঞ্ছারামপুর',   'CTG-BRA-08', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BRA'), 'Bijoynagar',    'বিজয়নগর',      'CTG-BRA-09', FALSE);

-- Chandpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-CHA'), 'Chandpur Sadar','চাঁদপুর সদর',  'CTG-CHA-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-CHA'), 'Haimchar',      'হাইমচর',       'CTG-CHA-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CHA'), 'Kachua',        'কচুয়া',        'CTG-CHA-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CHA'), 'Shahrasti',     'শাহরাস্তি',      'CTG-CHA-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CHA'), 'Matlab Dakshin','মতলব দক্ষিণ',  'CTG-CHA-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CHA'), 'Matlab Uttar',  'মতলব উত্তর',   'CTG-CHA-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CHA'), 'Hajiganj',      'হাজীগঞ্জ',      'CTG-CHA-07', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-CHA'), 'Faridganj',     'ফরিদগঞ্জ',     'CTG-CHA-08', FALSE);

-- Feni district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-FEN'), 'Feni Sadar',    'ফেনী সদর',     'CTG-FEN-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-FEN'), 'Chhagalnaiya',  'ছাগলনাইয়া',   'CTG-FEN-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-FEN'), 'Sonagazi',      'সোনাগাজী',     'CTG-FEN-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-FEN'), 'Fulgazi',       'ফুলগাজী',      'CTG-FEN-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-FEN'), 'Parshuram',     'পরশুরাম',      'CTG-FEN-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-FEN'), 'Daganbhuiyan',  'দাগনভূঞা',     'CTG-FEN-06', FALSE);

-- Noakhali district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Noakhali Sadar','নোয়াখালী সদর','CTG-NOA-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Companiganj',   'কোম্পানীগঞ্জ',  'CTG-NOA-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Begumganj',     'বেগমগঞ্জ',     'CTG-NOA-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Hatiya',        'হাতিয়া',       'CTG-NOA-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Subarnachar',   'সুবর্ণচর',      'CTG-NOA-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Kabirhat',      'কবিরহাট',      'CTG-NOA-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Senbagh',       'সেনবাগ',       'CTG-NOA-07', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Chatkhil',      'চাটখিল',       'CTG-NOA-08', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-NOA'), 'Sonaimuri',     'সোনাইমুড়ী',    'CTG-NOA-09', FALSE);

-- Lakshmipur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-LAK'), 'Lakshmipur Sadar','লক্ষ্মীপুর সদর','CTG-LAK-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-LAK'), 'Raipur',        'রায়পুর',       'CTG-LAK-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-LAK'), 'Ramganj',       'রামগঞ্জ',       'CTG-LAK-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-LAK'), 'Ramgati',       'রামগতি',       'CTG-LAK-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-LAK'), 'Kamalnagar',    'কমলনগর',      'CTG-LAK-05', FALSE);

-- Khagrachhari district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Khagrachhari Sadar','খাগড়াছড়ি সদর','CTG-KHA-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Dighinala',     'দীঘিনালা',      'CTG-KHA-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Panchhari',     'পানছড়ি',       'CTG-KHA-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Laxmichhari',   'লক্ষীছড়ি',      'CTG-KHA-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Mahalchhari',   'মহালছড়ি',      'CTG-KHA-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Manikchhari',   'মানিকছড়ি',     'CTG-KHA-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Ramgarh',       'রামগড়',        'CTG-KHA-07', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Matiranga',     'মাটিরাঙ্গা',      'CTG-KHA-08', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-KHA'), 'Guimara',       'গুইমারা',       'CTG-KHA-09', FALSE);

-- Rangamati district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Rangamati Sadar','রাঙ্গামাটি সদর','CTG-RAN-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Kaptai',        'কাপ্তাই',       'CTG-RAN-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Kawkhali',      'কাউখালী',      'CTG-RAN-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Baghaichhari',  'বাঘাইছড়ি',     'CTG-RAN-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Barkal',        'বরকল',         'CTG-RAN-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Langadu',       'লংগদু',        'CTG-RAN-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Rajasthali',    'রাজস্থলী',      'CTG-RAN-07', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Belaichhari',   'বিলাইছড়ি',     'CTG-RAN-08', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Juraichhari',   'জুরাছড়ি',      'CTG-RAN-09', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-RAN'), 'Naniarchar',    'নানিয়ারচর',    'CTG-RAN-10', FALSE);

-- Bandarban district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='CTG-BAN'), 'Bandarban Sadar','বান্দরবান সদর','CTG-BAN-01', TRUE),
    ((SELECT id FROM districts WHERE code='CTG-BAN'), 'Alikadam',      'আলীকদম',       'CTG-BAN-02', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BAN'), 'Naikhongchhari','নাইক্ষ্যংছড়ি',  'CTG-BAN-03', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BAN'), 'Rowangchhari',  'রোয়াংছড়ি',     'CTG-BAN-04', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BAN'), 'Lama',          'লামা',          'CTG-BAN-05', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BAN'), 'Ruma',          'রুমা',          'CTG-BAN-06', FALSE),
    ((SELECT id FROM districts WHERE code='CTG-BAN'), 'Thanchi',       'থানচি',         'CTG-BAN-07', FALSE);

-- ========================= RAJSHAHI DIVISION =========================

-- Rajshahi district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Rajshahi Sadar (Boalia)','রাজশাহী সদর','RAJ-RAJ-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Paba',          'পবা',          'RAJ-RAJ-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Durgapur',      'দুর্গাপুর',      'RAJ-RAJ-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Mohanpur',      'মোহনপুর',      'RAJ-RAJ-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Charghat',      'চারঘাট',       'RAJ-RAJ-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Puthia',        'পুঠিয়া',       'RAJ-RAJ-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Bagha',         'বাঘা',         'RAJ-RAJ-07', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Godagari',      'গোদাগাড়ী',    'RAJ-RAJ-08', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Tanore',        'তানোর',        'RAJ-RAJ-09', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-RAJ'), 'Bagmara',       'বাগমারা',      'RAJ-RAJ-10', FALSE);

-- Natore district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAJ-NAT'), 'Natore Sadar',  'নাটোর সদর',    'RAJ-NAT-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAJ-NAT'), 'Singra',        'সিংড়া',        'RAJ-NAT-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAT'), 'Baraigram',     'বড়াইগ্রাম',    'RAJ-NAT-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAT'), 'Bagatipara',    'বাগাতিপাড়া',   'RAJ-NAT-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAT'), 'Lalpur',        'লালপুর',       'RAJ-NAT-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAT'), 'Gurudaspur',    'গুরুদাসপুর',    'RAJ-NAT-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAT'), 'Naldanga',      'নলডাঙ্গা',      'RAJ-NAT-07', FALSE);

-- Naogaon district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Naogaon Sadar', 'নওগাঁ সদর',    'RAJ-NAO-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Mahadebpur',    'মহাদেবপুর',    'RAJ-NAO-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Patnitala',     'পত্নীতলা',      'RAJ-NAO-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Dhamoirhat',    'ধামইরহাট',     'RAJ-NAO-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Niamatpur',     'নিয়ামতপুর',    'RAJ-NAO-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Manda',         'মান্দা',        'RAJ-NAO-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Atrai',         'আত্রাই',       'RAJ-NAO-07', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Raninagar',     'রাণীনগর',      'RAJ-NAO-08', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Badalgachhi',   'বদলগাছী',      'RAJ-NAO-09', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Sapahar',       'সাপাহার',      'RAJ-NAO-10', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-NAO'), 'Porsha',        'পোরশা',        'RAJ-NAO-11', FALSE);

-- Chapainawabganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAJ-CHA'), 'Chapainawabganj Sadar','চাঁপাইনবাবগঞ্জ সদর','RAJ-CHA-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAJ-CHA'), 'Gomastapur',    'গোমস্তাপুর',    'RAJ-CHA-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-CHA'), 'Nachole',       'নাচোল',        'RAJ-CHA-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-CHA'), 'Bholahat',      'ভোলাহাট',      'RAJ-CHA-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-CHA'), 'Shibganj',      'শিবগঞ্জ',      'RAJ-CHA-05', FALSE);

-- Pabna district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Pabna Sadar',   'পাবনা সদর',    'RAJ-PAB-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Sujanagar',     'সুজানগর',      'RAJ-PAB-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Ishwardi',      'ঈশ্বরদী',       'RAJ-PAB-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Bhangura',      'ভাঙ্গুড়া',      'RAJ-PAB-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Bera',          'বেড়া',         'RAJ-PAB-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Atgharia',      'আটঘরিয়া',     'RAJ-PAB-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Chatmohar',     'চাটমোহর',      'RAJ-PAB-07', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Santhia',       'সাঁথিয়া',       'RAJ-PAB-08', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-PAB'), 'Faridpur',      'ফরিদপুর',      'RAJ-PAB-09', FALSE);

-- Bogura district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Bogura Sadar',  'বগুড়া সদর',    'RAJ-BOG-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Sherpur',       'শেরপুর',       'RAJ-BOG-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Dhunat',        'ধুনট',         'RAJ-BOG-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Adamdighi',     'আদমদীঘি',     'RAJ-BOG-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Nandigram',     'নন্দীগ্রাম',     'RAJ-BOG-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Sonatala',      'সোনাতলা',      'RAJ-BOG-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Dupchanchia',   'দুপচাঁচিয়া',    'RAJ-BOG-07', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Sariakandi',    'সারিয়াকান্দি',   'RAJ-BOG-08', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Shajahanpur',   'শাজাহানপুর',   'RAJ-BOG-09', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Gabtali',       'গাবতলী',       'RAJ-BOG-10', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Kahaloo',       'কাহালু',        'RAJ-BOG-11', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-BOG'), 'Shibganj',      'শিবগঞ্জ',      'RAJ-BOG-12', FALSE);

-- Sirajganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Sirajganj Sadar','সিরাজগঞ্জ সদর','RAJ-SIR-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Belkuchi',      'বেলকুচি',       'RAJ-SIR-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Chauhali',      'চৌহালি',        'RAJ-SIR-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Kamarkhanda',   'কামারখন্দ',    'RAJ-SIR-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Kazipur',       'কাজীপুর',      'RAJ-SIR-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Raiganj',       'রায়গঞ্জ',      'RAJ-SIR-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Shahjadpur',    'শাহজাদপুর',    'RAJ-SIR-07', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Tarash',        'তাড়াশ',        'RAJ-SIR-08', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-SIR'), 'Ullapara',      'উল্লাপাড়া',     'RAJ-SIR-09', FALSE);

-- Joypurhat district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAJ-JOY'), 'Joypurhat Sadar','জয়পুরহাট সদর','RAJ-JOY-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAJ-JOY'), 'Akkelpur',      'আক্কেলপুর',     'RAJ-JOY-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-JOY'), 'Kalai',         'কালাই',        'RAJ-JOY-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-JOY'), 'Khetlal',       'ক্ষেতলাল',      'RAJ-JOY-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAJ-JOY'), 'Panchbibi',     'পাঁচবিবি',      'RAJ-JOY-05', FALSE);

-- ========================= KHULNA DIVISION =========================

-- Khulna district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Khulna Sadar',  'খুলনা সদর',    'KHU-KHU-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Dumuria',       'ডুমুরিয়া',     'KHU-KHU-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Batiaghata',    'বটিয়াঘাটা',    'KHU-KHU-03', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Dacope',        'দাকোপ',        'KHU-KHU-04', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Paikgachha',    'পাইকগাছা',     'KHU-KHU-05', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Koyra',         'কয়রা',         'KHU-KHU-06', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Terokhada',     'তেরখাদা',      'KHU-KHU-07', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Dighalia',      'দিঘলিয়া',      'KHU-KHU-08', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Phultala',      'ফুলতলা',       'KHU-KHU-09', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KHU'), 'Rupsha',        'রূপসা',        'KHU-KHU-10', FALSE);

-- Bagerhat district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Bagerhat Sadar','বাগেরহাট সদর', 'KHU-BAG-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Chitalmari',    'চিতলমারী',      'KHU-BAG-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Fakirhat',      'ফকিরহাট',      'KHU-BAG-03', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Kachua',        'কচুয়া',        'KHU-BAG-04', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Mollahat',      'মোল্লাহাট',     'KHU-BAG-05', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Mongla',        'মোংলা',        'KHU-BAG-06', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Morrelganj',    'মোড়েলগঞ্জ',    'KHU-BAG-07', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Rampal',        'রামপাল',       'KHU-BAG-08', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-BAG'), 'Sarankhola',    'শরণখোলা',     'KHU-BAG-09', FALSE);

-- Satkhira district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-SAT'), 'Satkhira Sadar','সাতক্ষীরা সদর', 'KHU-SAT-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-SAT'), 'Assasuni',      'আশাশুনি',      'KHU-SAT-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-SAT'), 'Debhata',       'দেবহাটা',      'KHU-SAT-03', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-SAT'), 'Tala',          'তালা',         'KHU-SAT-04', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-SAT'), 'Kalaroa',       'কলারোয়া',     'KHU-SAT-05', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-SAT'), 'Kaliganj',      'কালিগঞ্জ',     'KHU-SAT-06', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-SAT'), 'Shyamnagar',    'শ্যামনগর',     'KHU-SAT-07', FALSE);

-- Jashore district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-JAS'), 'Jashore Sadar', 'যশোর সদর',     'KHU-JAS-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-JAS'), 'Abhaynagar',    'অভয়নগর',      'KHU-JAS-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JAS'), 'Bagherpara',    'বাঘারপাড়া',    'KHU-JAS-03', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JAS'), 'Chaugachha',    'চৌগাছা',       'KHU-JAS-04', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JAS'), 'Jhikargachha',  'ঝিকরগাছা',     'KHU-JAS-05', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JAS'), 'Keshabpur',     'কেশবপুর',      'KHU-JAS-06', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JAS'), 'Manirampur',    'মণিরামপুর',    'KHU-JAS-07', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JAS'), 'Sharsha',       'শার্শা',        'KHU-JAS-08', FALSE);

-- Magura district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-MAG'), 'Magura Sadar',  'মাগুরা সদর',    'KHU-MAG-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-MAG'), 'Mohammadpur',   'মহম্মদপুর',    'KHU-MAG-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-MAG'), 'Shalikha',      'শালিখা',       'KHU-MAG-03', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-MAG'), 'Sreepur',       'শ্রীপুর',       'KHU-MAG-04', FALSE);

-- Jhenaidah district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-JHE'), 'Jhenaidah Sadar','ঝিনাইদহ সদর', 'KHU-JHE-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-JHE'), 'Harinakunda',   'হরিণাকুন্ডু',    'KHU-JHE-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JHE'), 'Kaliganj',      'কালীগঞ্জ',     'KHU-JHE-03', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JHE'), 'Kotchandpur',   'কোটচাঁদপুর',   'KHU-JHE-04', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JHE'), 'Maheshpur',     'মহেশপুর',      'KHU-JHE-05', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-JHE'), 'Shailkupa',     'শৈলকুপা',      'KHU-JHE-06', FALSE);

-- Narail district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-NAR'), 'Narail Sadar',  'নড়াইল সদর',    'KHU-NAR-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-NAR'), 'Kalia',         'কালিয়া',       'KHU-NAR-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-NAR'), 'Lohagara',      'লোহাগড়া',     'KHU-NAR-03', FALSE);

-- Kushtia district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-KUS'), 'Kushtia Sadar', 'কুষ্টিয়া সদর',  'KHU-KUS-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-KUS'), 'Kumarkhali',    'কুমারখালী',     'KHU-KUS-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KUS'), 'Khoksa',        'খোকসা',        'KHU-KUS-03', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KUS'), 'Mirpur',        'মিরপুর',       'KHU-KUS-04', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KUS'), 'Daulatpur',     'দৌলতপুর',      'KHU-KUS-05', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-KUS'), 'Bheramara',     'ভেড়ামারা',    'KHU-KUS-06', FALSE);

-- Chuadanga district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-CHU'), 'Chuadanga Sadar','চুয়াডাঙ্গা সদর','KHU-CHU-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-CHU'), 'Alamdanga',     'আলমডাঙ্গা',    'KHU-CHU-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-CHU'), 'Damurhuda',     'দামুড়হুদা',     'KHU-CHU-03', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-CHU'), 'Jibannagar',    'জীবননগর',     'KHU-CHU-04', FALSE);

-- Meherpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='KHU-MEH'), 'Meherpur Sadar','মেহেরপুর সদর', 'KHU-MEH-01', TRUE),
    ((SELECT id FROM districts WHERE code='KHU-MEH'), 'Gangni',        'গাংনী',        'KHU-MEH-02', FALSE),
    ((SELECT id FROM districts WHERE code='KHU-MEH'), 'Mujibnagar',    'মুজিবনগর',     'KHU-MEH-03', FALSE);

-- ========================= BARISHAL DIVISION =========================

-- Barishal district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Barishal Sadar','বরিশাল সদর',   'BAR-BAR-01', TRUE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Bakerganj',     'বাকেরগঞ্জ',    'BAR-BAR-02', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Babuganj',      'বাবুগঞ্জ',      'BAR-BAR-03', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Wazirpur',      'উজিরপুর',      'BAR-BAR-04', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Banaripara',    'বানারীপাড়া',   'BAR-BAR-05', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Gournadi',      'গৌরনদী',       'BAR-BAR-06', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Agailjhara',    'আগৈলঝাড়া',    'BAR-BAR-07', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Mehendiganj',   'মেহেন্দিগঞ্জ',   'BAR-BAR-08', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Muladi',        'মুলাদী',        'BAR-BAR-09', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BAR'), 'Hizla',         'হিজলা',        'BAR-BAR-10', FALSE);

-- Patuakhali district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='BAR-PAT'), 'Patuakhali Sadar','পটুয়াখালী সদর','BAR-PAT-01', TRUE),
    ((SELECT id FROM districts WHERE code='BAR-PAT'), 'Bauphal',       'বাউফল',        'BAR-PAT-02', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PAT'), 'Dashmina',      'দশমিনা',       'BAR-PAT-03', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PAT'), 'Galachipa',     'গলাচিপা',      'BAR-PAT-04', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PAT'), 'Kalapara',      'কলাপাড়া',     'BAR-PAT-05', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PAT'), 'Mirzaganj',     'মির্জাগঞ্জ',     'BAR-PAT-06', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PAT'), 'Dumki',         'দুমকি',        'BAR-PAT-07', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PAT'), 'Rangabali',     'রাঙ্গাবালী',     'BAR-PAT-08', FALSE);

-- Bhola district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='BAR-BHO'), 'Bhola Sadar',   'ভোলা সদর',     'BAR-BHO-01', TRUE),
    ((SELECT id FROM districts WHERE code='BAR-BHO'), 'Borhanuddin',   'বোরহানউদ্দিন',  'BAR-BHO-02', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BHO'), 'Charfassion',   'চরফ্যাশন',     'BAR-BHO-03', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BHO'), 'Doulatkhan',    'দৌলতখান',      'BAR-BHO-04', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BHO'), 'Lalmohan',      'লালমোহন',      'BAR-BHO-05', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BHO'), 'Manpura',       'মনপুরা',       'BAR-BHO-06', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BHO'), 'Tazumuddin',    'তজুমদ্দিন',     'BAR-BHO-07', FALSE);

-- Pirojpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='BAR-PIR'), 'Pirojpur Sadar','পিরোজপুর সদর', 'BAR-PIR-01', TRUE),
    ((SELECT id FROM districts WHERE code='BAR-PIR'), 'Nazirpur',      'নাজিরপুর',      'BAR-PIR-02', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PIR'), 'Kawkhali',      'কাউখালী',      'BAR-PIR-03', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PIR'), 'Bhandaria',     'ভান্ডারিয়া',     'BAR-PIR-04', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PIR'), 'Mathbaria',     'মঠবাড়িয়া',    'BAR-PIR-05', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PIR'), 'Nesarabad (Swarupkathi)','নেছারাবাদ','BAR-PIR-06', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-PIR'), 'Zianagar (Indurkani)','জিয়ানগর','BAR-PIR-07', FALSE);

-- Barguna district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='BAR-BRG'), 'Barguna Sadar', 'বরগুনা সদর',   'BAR-BRG-01', TRUE),
    ((SELECT id FROM districts WHERE code='BAR-BRG'), 'Amtali',        'আমতলী',       'BAR-BRG-02', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BRG'), 'Betagi',        'বেতাগী',        'BAR-BRG-03', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BRG'), 'Bamna',         'বামনা',         'BAR-BRG-04', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BRG'), 'Patharghata',   'পাথরঘাটা',     'BAR-BRG-05', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-BRG'), 'Taltali',       'তালতলী',       'BAR-BRG-06', FALSE);

-- Jhalokati district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='BAR-JHA'), 'Jhalokati Sadar','ঝালকাঠি সদর',  'BAR-JHA-01', TRUE),
    ((SELECT id FROM districts WHERE code='BAR-JHA'), 'Kathalia',      'কাঠালিয়া',     'BAR-JHA-02', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-JHA'), 'Nalchity',      'নলছিটি',        'BAR-JHA-03', FALSE),
    ((SELECT id FROM districts WHERE code='BAR-JHA'), 'Rajapur',       'রাজাপুর',       'BAR-JHA-04', FALSE);

-- ========================= SYLHET DIVISION =========================

-- Sylhet district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Sylhet Sadar',  'সিলেট সদর',     'SYL-SYL-01', TRUE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Beanibazar',    'বিয়ানীবাজার',   'SYL-SYL-02', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Bishwanath',    'বিশ্বনাথ',       'SYL-SYL-03', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Companiganj',   'কোম্পানীগঞ্জ',   'SYL-SYL-04', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Fenchuganj',    'ফেঞ্চুগঞ্জ',      'SYL-SYL-05', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Golapganj',     'গোলাপগঞ্জ',     'SYL-SYL-06', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Gowainghat',    'গোয়াইনঘাট',    'SYL-SYL-07', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Jaintiapur',    'জৈন্তাপুর',      'SYL-SYL-08', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Kanaighat',     'কানাইঘাট',      'SYL-SYL-09', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Zakiganj',      'জকিগঞ্জ',       'SYL-SYL-10', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Balaganj',      'বালাগঞ্জ',       'SYL-SYL-11', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Osmani Nagar',  'ওসমানী নগর',   'SYL-SYL-12', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SYL'), 'Dakshin Surma', 'দক্ষিণ সুরমা',   'SYL-SYL-13', FALSE);

-- Moulvibazar district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='SYL-MOU'), 'Moulvibazar Sadar','মৌলভীবাজার সদর','SYL-MOU-01', TRUE),
    ((SELECT id FROM districts WHERE code='SYL-MOU'), 'Barlekha',      'বড়লেখা',       'SYL-MOU-02', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-MOU'), 'Kamalganj',     'কমলগঞ্জ',      'SYL-MOU-03', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-MOU'), 'Kulaura',       'কুলাউড়া',      'SYL-MOU-04', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-MOU'), 'Rajnagar',      'রাজনগর',       'SYL-MOU-05', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-MOU'), 'Sreemangal',    'শ্রীমঙ্গল',       'SYL-MOU-06', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-MOU'), 'Juri',          'জুড়ী',          'SYL-MOU-07', FALSE);

-- Habiganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Habiganj Sadar','হবিগঞ্জ সদর',   'SYL-HAB-01', TRUE),
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Nabiganj',      'নবীগঞ্জ',       'SYL-HAB-02', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Bahubal',       'বাহুবল',        'SYL-HAB-03', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Ajmiriganj',    'আজমিরীগঞ্জ',    'SYL-HAB-04', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Baniyachong',   'বানিয়াচং',      'SYL-HAB-05', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Lakhai',        'লাখাই',         'SYL-HAB-06', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Madhabpur',     'মাধবপুর',       'SYL-HAB-07', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Chunarughat',   'চুনারুঘাট',      'SYL-HAB-08', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-HAB'), 'Shaistaganj',   'শায়েস্তাগঞ্জ',    'SYL-HAB-09', FALSE);

-- Sunamganj district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Sunamganj Sadar','সুনামগঞ্জ সদর', 'SYL-SUN-01', TRUE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'South Sunamganj','দক্ষিণ সুনামগঞ্জ','SYL-SUN-02', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Bishwamvarpur','বিশ্বম্ভরপুর',    'SYL-SUN-03', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Chhatak',       'ছাতক',         'SYL-SUN-04', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Derai',         'দিরাই',         'SYL-SUN-05', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Dharampasha',   'ধর্মপাশা',      'SYL-SUN-06', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Dowarabazar',   'দোয়ারাবাজার',   'SYL-SUN-07', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Jagannathpur',  'জগন্নাথপুর',    'SYL-SUN-08', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Jamalganj',     'জামালগঞ্জ',     'SYL-SUN-09', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Sulla',         'শাল্লা',         'SYL-SUN-10', FALSE),
    ((SELECT id FROM districts WHERE code='SYL-SUN'), 'Tahirpur',      'তাহিরপুর',      'SYL-SUN-11', FALSE);

-- ========================= RANGPUR DIVISION =========================

-- Rangpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAN-RAN'), 'Rangpur Sadar', 'রংপুর সদর',    'RAN-RAN-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAN-RAN'), 'Badarganj',     'বদরগঞ্জ',      'RAN-RAN-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-RAN'), 'Mithapukur',    'মিঠাপুকুর',     'RAN-RAN-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-RAN'), 'Pirgachha',     'পীরগাছা',       'RAN-RAN-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-RAN'), 'Pirganj',       'পীরগঞ্জ',       'RAN-RAN-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-RAN'), 'Taraganj',      'তারাগঞ্জ',      'RAN-RAN-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-RAN'), 'Gangachhara',   'গংগাচড়া',      'RAN-RAN-07', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-RAN'), 'Kaunia',        'কাউনিয়া',      'RAN-RAN-08', FALSE);

-- Dinajpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Dinajpur Sadar','দিনাজপুর সদর',  'RAN-DIN-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Birganj',       'বীরগঞ্জ',       'RAN-DIN-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Birampur',      'বিরামপুর',      'RAN-DIN-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Birol',         'বিরল',          'RAN-DIN-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Bochaganj',     'বোচাগঞ্জ',      'RAN-DIN-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Chirirbandar',  'চিরিরবন্দর',     'RAN-DIN-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Phulbari',      'ফুলবাড়ী',      'RAN-DIN-07', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Ghoraghat',     'ঘোড়াঘাট',     'RAN-DIN-08', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Hakimpur',      'হাকিমপুর',      'RAN-DIN-09', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Kaharole',      'কাহারোল',      'RAN-DIN-10', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Khansama',      'খানসামা',      'RAN-DIN-11', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Nawabganj',     'নবাবগঞ্জ',     'RAN-DIN-12', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-DIN'), 'Parbatipur',    'পার্বতীপুর',     'RAN-DIN-13', FALSE);

-- Kurigram district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Kurigram Sadar','কুড়িগ্রাম সদর', 'RAN-KUR-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Nageshwari',    'নাগেশ্বরী',      'RAN-KUR-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Bhurungamari',  'ভুরুঙ্গামারী',   'RAN-KUR-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Phulbari',      'ফুলবাড়ী',      'RAN-KUR-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Rajarhat',      'রাজারহাট',     'RAN-KUR-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Ulipur',        'উলিপুর',       'RAN-KUR-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Chilmari',      'চিলমারী',       'RAN-KUR-07', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Rowmari',       'রৌমারী',       'RAN-KUR-08', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-KUR'), 'Char Rajibpur', 'চর রাজিবপুর',  'RAN-KUR-09', FALSE);

-- Gaibandha district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAN-GAI'), 'Gaibandha Sadar','গাইবান্ধা সদর', 'RAN-GAI-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAN-GAI'), 'Sadullapur',    'সাদুল্লাপুর',     'RAN-GAI-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-GAI'), 'Palashbari',    'পলাশবাড়ী',    'RAN-GAI-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-GAI'), 'Saghata',       'সাঘাটা',        'RAN-GAI-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-GAI'), 'Gobindaganj',   'গোবিন্দগঞ্জ',    'RAN-GAI-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-GAI'), 'Sundarganj',    'সুন্দরগঞ্জ',      'RAN-GAI-06', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-GAI'), 'Phulchhari',    'ফুলছড়ি',       'RAN-GAI-07', FALSE);

-- Nilphamari district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAN-NIL'), 'Nilphamari Sadar','নীলফামারী সদর','RAN-NIL-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAN-NIL'), 'Saidpur',       'সৈয়দপুর',      'RAN-NIL-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-NIL'), 'Jaldhaka',      'জলঢাকা',       'RAN-NIL-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-NIL'), 'Kishoreganj',   'কিশোরগঞ্জ',    'RAN-NIL-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-NIL'), 'Domar',         'ডোমার',        'RAN-NIL-05', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-NIL'), 'Dimla',         'ডিমলা',        'RAN-NIL-06', FALSE);

-- Panchagarh district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAN-PAN'), 'Panchagarh Sadar','পঞ্চগড় সদর', 'RAN-PAN-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAN-PAN'), 'Debiganj',      'দেবীগঞ্জ',       'RAN-PAN-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-PAN'), 'Boda',          'বোদা',          'RAN-PAN-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-PAN'), 'Atwari',        'আটোয়ারী',      'RAN-PAN-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-PAN'), 'Tetulia',       'তেঁতুলিয়া',      'RAN-PAN-05', FALSE);

-- Thakurgaon district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAN-THA'), 'Thakurgaon Sadar','ঠাকুরগাঁও সদর','RAN-THA-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAN-THA'), 'Pirganj',       'পীরগঞ্জ',       'RAN-THA-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-THA'), 'Ranisankail',   'রাণীশংকৈল',    'RAN-THA-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-THA'), 'Haripur',       'হরিপুর',        'RAN-THA-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-THA'), 'Baliadangi',    'বালিয়াডাঙ্গী',   'RAN-THA-05', FALSE);

-- Lalmonirhat district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='RAN-LAL'), 'Lalmonirhat Sadar','লালমনিরহাট সদর','RAN-LAL-01', TRUE),
    ((SELECT id FROM districts WHERE code='RAN-LAL'), 'Aditmari',      'আদিতমারী',     'RAN-LAL-02', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-LAL'), 'Kaliganj',      'কালীগঞ্জ',      'RAN-LAL-03', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-LAL'), 'Hatibandha',    'হাতীবান্ধা',     'RAN-LAL-04', FALSE),
    ((SELECT id FROM districts WHERE code='RAN-LAL'), 'Patgram',       'পাটগ্রাম',      'RAN-LAL-05', FALSE);

-- ========================= MYMENSINGH DIVISION =========================

-- Mymensingh district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Mymensingh Sadar','ময়মনসিংহ সদর','MYM-MYM-01', TRUE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Trishal',       'ত্রিশাল',        'MYM-MYM-02', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Bhaluka',       'ভালুকা',        'MYM-MYM-03', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Muktagachha',   'মুক্তাগাছা',     'MYM-MYM-04', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Gaffargaon',    'গফরগাঁও',      'MYM-MYM-05', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Fulbaria',      'ফুলবাড়িয়া',    'MYM-MYM-06', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Gauripur',      'গৌরীপুর',      'MYM-MYM-07', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Ishwarganj',    'ঈশ্বরগঞ্জ',      'MYM-MYM-08', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Nandail',       'নান্দাইল',       'MYM-MYM-09', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Phulpur',       'ফুলপুর',        'MYM-MYM-10', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Haluaghat',     'হালুয়াঘাট',     'MYM-MYM-11', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Dhobaura',      'ধোবাউড়া',     'MYM-MYM-12', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-MYM'), 'Tara Khanda',   'তারাকান্দা',    'MYM-MYM-13', FALSE);

-- Jamalpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='MYM-JAM'), 'Jamalpur Sadar','জামালপুর সদর', 'MYM-JAM-01', TRUE),
    ((SELECT id FROM districts WHERE code='MYM-JAM'), 'Melandaha',     'মেলান্দহ',      'MYM-JAM-02', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-JAM'), 'Islampur',      'ইসলামপুর',     'MYM-JAM-03', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-JAM'), 'Dewanganj',     'দেওয়ানগঞ্জ',   'MYM-JAM-04', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-JAM'), 'Sarishabari',   'সরিষাবাড়ী',    'MYM-JAM-05', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-JAM'), 'Madarganj',     'মাদারগঞ্জ',    'MYM-JAM-06', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-JAM'), 'Bakshiganj',    'বকশীগঞ্জ',     'MYM-JAM-07', FALSE);

-- Sherpur district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='MYM-SHE'), 'Sherpur Sadar', 'শেরপুর সদর',   'MYM-SHE-01', TRUE),
    ((SELECT id FROM districts WHERE code='MYM-SHE'), 'Nalitabari',    'নালিতাবাড়ী',   'MYM-SHE-02', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-SHE'), 'Sreebardi',     'শ্রীবরদী',       'MYM-SHE-03', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-SHE'), 'Nakla',         'নকলা',         'MYM-SHE-04', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-SHE'), 'Jhenaigati',    'ঝিনাইগাতী',     'MYM-SHE-05', FALSE);

-- Netrokona district
INSERT INTO upazilas (district_id, name, bn_name, code, is_sadar) VALUES
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Netrokona Sadar','নেত্রকোনা সদর', 'MYM-NET-01', TRUE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Barhatta',      'বারহাট্টা',      'MYM-NET-02', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Durgapur',      'দুর্গাপুর',      'MYM-NET-03', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Kendua',        'কেন্দুয়া',       'MYM-NET-04', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Atpara',        'আটপাড়া',      'MYM-NET-05', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Madan',         'মদন',          'MYM-NET-06', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Khaliajuri',    'খালিয়াজুরী',    'MYM-NET-07', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Kalmakanda',    'কলমাকান্দা',    'MYM-NET-08', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Mohanganj',     'মোহনগঞ্জ',     'MYM-NET-09', FALSE),
    ((SELECT id FROM districts WHERE code='MYM-NET'), 'Purbadhala',    'পূর্বধলা',       'MYM-NET-10', FALSE);

-- =============================================================================
-- END OF GEOGRAPHY SEED
-- =============================================================================
