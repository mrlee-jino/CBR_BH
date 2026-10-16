-- Local reference data only. Never seed users, admin roles, or fictional live listings.
insert into public.amenities (code, label) values
('wifi', 'Wi-Fi'), ('shared_kitchen', 'Shared kitchen'),
('air_conditioning', 'Air conditioning'), ('parking', 'Parking'),
('laundry', 'Laundry area'), ('private_bathroom', 'Private bathroom')
on conflict (code) do nothing;
