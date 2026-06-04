import pandas as pd
import os

CSV_PATH = '/Users/jeonghyeonlee/Desktop/Ongoing/2026/2026_육종과제/data/Honeybee_genome_map/data/master_metadata.csv'
OUTPUT_PATH = '/Users/jeonghyeonlee/Desktop/Ongoing/2026/2026_육종과제/data/Honeybee_genome_map/backend/app/data/wgs_world_data.tsv'

# Define standard coordinates lookup table
COUNTRY_COORDS = {
    "France": (46.2276, 2.2137),
    "USA": (37.0902, -95.7129),
    "China": (35.8617, 104.1954),
    "Sweden": (60.1282, 18.6435),
    "South Africa": (-30.5595, 22.9375),
    "Italy": (41.8719, 12.5674),
    "Puerto Rico": (18.2208, -66.5901),
    "Spain": (40.4637, -3.7492),
    "Switzerland": (46.8182, 8.2275),
    "Japan": (36.2048, 138.2529),
    "Ireland": (53.4129, -8.2439),
    "Australia": (-25.2744, 133.7751),
    "Algeria": (28.0339, 1.6596),
    "Argentina": (-38.4161, -63.6167),
    "United Kingdom": (55.3781, -3.4360),
    "Norway": (60.4720, 8.4689),
    "Finland": (61.9241, 25.7482),
    "Korea": (35.9078, 127.7669),
    "Rep. Korea": (35.9078, 127.7669),
    "South Korea": (35.9078, 127.7669),
    "Brazil": (-14.2350, -51.9253),
    "Kenya": (-1.2921, 36.8219),
    "Cameroon": (7.3697, 12.3547),
    "Chad": (15.4542, 18.7322),
    "Gabon": (-0.8037, 11.6094),
    "Congo": (-0.2280, 15.8277),
    "Central African Republic": (6.6111, 20.9394),
    "Germany": (51.1657, 10.4515),
    "Canada": (56.1304, -106.3468),
    "Russia": (61.5240, 105.3188),
    "India": (20.5937, 78.9629),
    "New Zealand": (-40.9006, 174.8860),
    "Austria": (47.5162, 14.5501),
    "Belgium": (50.5039, 4.4699),
    "Denmark": (56.2639, 9.5018),
    "Greece": (39.0742, 21.8243),
    "Portugal": (39.3999, -8.2245),
    "Turkey": (38.9637, 35.2433),
    "Vietnam": (14.0583, 108.2772),
    "Thailand": (15.8700, 100.9925),
    "Malaysia": (4.2105, 101.9758),
    "Indonesia": (-0.7893, 113.9213),
}

REGION_COORDS = {
    # USA
    "Urbana, Illinois": (40.1105, -88.2073),
    "West Lafayette, IN": (40.4259, -86.9081),
    "KY": (37.8393, -84.2700),
    "California": (36.7783, -119.4179),
    "Louisiana": (31.2448, -92.1450),
    "Utah": (39.3210, -111.0937),
    "Texas": (31.9686, -99.9018),
    "Maryland": (39.0458, -76.6413),
    "Arizona": (34.0489, -111.0937),
    "Florida": (27.6648, -81.5158),
    "Hawaii": (19.8968, -155.5828),
    # France
    "Vaucluse": (44.0000, 5.1500),
    "Tarn": (43.9000, 2.2000),
    "Ariege": (43.0000, 1.5000),
    "Corsica": (42.1512, 9.0129),
    "Ouessant": (48.4637, -5.0833),
    "Brittany": (48.2020, -2.9326),
    "Avignon": (43.9493, 4.8055),
    # China
    "Guizhou": (26.8154, 106.8748),
    "Beijing": (39.9042, 116.4074),
    "Kunming": (25.0422, 102.7100),
    "Sichuan": (30.6570, 104.0660),
    "Sichuan Province, Maerkang City": (31.9000, 102.2000),
    "FuJian Province, LongYang City": (25.0800, 117.0200),
    "Hainan Province, Haikou City": (20.0174, 110.3312),
    "HeBei Province, XingLong City": (40.4100, 117.5000),
    "HuNan Province, ChangDe City": (29.0300, 111.6800),
    "Jilin Province, JilinCity": (43.8378, 126.5494),
    "JiangXi Province, YiChun City": (27.8000, 114.3800),
    "GanSu Province, LongNan City": (33.4000, 104.9000),
    "NingXia Province, GuYuan City": (36.0000, 106.2800),
    "GanSu Province, QingYang City": (35.7000, 107.6000),
    "ShaanXi Province, BaoJi City": (34.3500, 107.1500),
    "ShanDong Province, ZiBo City": (36.8100, 118.0500),
    "ShanXi Province, XiAn City": (34.2658, 108.9544),
    "YunNan Province, PuEr City": (22.7900, 100.9700),
    # Sweden
    "Gotland": (57.5000, 18.5000),
    "Aland": (60.1785, 19.9156),
    # South Africa
    "Stellenbosch": (-33.9321, 18.8602),
    "Cape of Good Hope region": (-34.3568, 18.4716),
    # Ireland
    "Galway": (53.2707, -9.0568),
    "Donegal": (54.6538, -8.1103),
    # Japan
    "Niigata": (37.9161, 139.0364),
    "Nagano": (36.6485, 138.1948),
    "Mie": (34.7303, 136.5086),
    "Kyoto": (35.0116, 135.7681),
    "Ehime": (33.8416, 132.7657),
    "Okayama": (34.6551, 133.9196),
    "Shimane": (35.4722, 133.0505),
    "Fukuoka": (33.6064, 130.4180),
    "Kagoshima": (31.5966, 130.5578),
    "Aomori": (40.8244, 140.7473),
}

def get_lat_lng(country, region):
    # Try Region coordinate mapping
    if isinstance(region, str) and region in REGION_COORDS:
        return REGION_COORDS[region]
    
    # Clean region lookup
    if isinstance(region, str):
        cleaned_reg = region.split(",")[0].strip()
        if cleaned_reg in REGION_COORDS:
            return REGION_COORDS[cleaned_reg]
            
    # Default to Country coordinate mapping
    if isinstance(country, str) and country in COUNTRY_COORDS:
        return COUNTRY_COORDS[country]
        
    return (0.0, 0.0)

def main():
    print("Processing master metadata...")
    df = pd.read_csv(CSV_PATH)
    
    # Fill NAs
    df['Country'] = df['Country'].fillna('Unknown').str.strip()
    df['Region'] = df['Region'].fillna('Unknown').str.strip()
    df['Species'] = df['Species'].fillna('Apis mellifera').str.strip()
    
    # Replace common placeholder words
    df.loc[df['Country'] == 'not collected', 'Country'] = 'Unknown'
    df.loc[df['Country'] == 'not applicable', 'Country'] = 'Unknown'
    
    # Aggregate counts by Country, Region, Species
    agg_df = df.groupby(['Country', 'Region', 'Species']).size().reset_index(name='Count')
    
    # Apply lat/lng coordinate resolving
    coords = [get_lat_lng(row['Country'], row['Region']) for _, row in agg_df.iterrows()]
    agg_df['lat'] = [c[0] for c in coords]
    agg_df['lng'] = [c[1] for c in coords]
    
    # Exclude 0,0 locations for visual map safety
    agg_df = agg_df[(agg_df['lat'] != 0.0) | (agg_df['lng'] != 0.0)]
    
    print(f"Aggregated {len(agg_df)} WGS world records groups.")
    agg_df.to_csv(OUTPUT_PATH, sep='\t', index=False)
    print(f"Successfully generated {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
