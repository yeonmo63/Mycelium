
import random
import datetime
import uuid

# Configuration
TOTAL_TARGET = 5000000
METADATA_FILE = 'metadata.txt'
SALES_CSV = 'sales_data.csv'
INV_LOG_CSV = 'inventory_logs_data.csv'

# End date for generation
TODAY = datetime.date(2026, 1, 31)
START_DATE_LIMIT = datetime.date(2016, 1, 1)

def generate():
    customers = []
    products = []
    
    with open(METADATA_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for line in lines:
            line = line.strip()
            if not line: continue
            parts = line.split('|')
            if len(parts) == 2: # Customer id|join_date
                cid, join_date_str = parts
                try:
                    jd = datetime.datetime.strptime(join_date_str, '%Y-%m-%d').date()
                except:
                    jd = START_DATE_LIMIT
                customers.append({'id': cid, 'join_date': jd})
            elif len(parts) >= 4: # Product id|name|spec|price|code
                pid, name, spec, price, code = parts[0], parts[1], parts[2], parts[3], parts[4] if len(parts) > 4 else ''
                products.append({'id': pid, 'name': name, 'spec': spec, 'price': int(price), 'code': code})

    print(f"Loaded {len(customers)} customers and {len(products)} products.")

    # Calculate count per customer to reach ~5M
    # Total = sum(counts)
    # Average needed = 5M / len(customers)
    avg_needed = TOTAL_TARGET / len(customers)
    
    # We'll use a slightly more controlled distribution to get closer to 5M
    # Each customer gets random(1, 1000), but we scale it to fit 5M.
    customer_counts = []
    raw_total = 0
    for _ in range(len(customers)):
        c_count = random.randint(1, 1000)
        customer_counts.append(c_count)
        raw_total += c_count
    
    # Scaling factor
    factor = TOTAL_TARGET / raw_total
    
    actual_counts = [int(c * factor) for c in customer_counts]
    diff = TOTAL_TARGET - sum(actual_counts)
    # Adjust the last ones
    for i in range(abs(diff)):
        actual_counts[i % len(customers)] += (1 if diff > 0 else -1)

    print(f"Total records to generate: {sum(actual_counts)}")

    with open(SALES_CSV, 'w', encoding='utf-8') as fs, open(INV_LOG_CSV, 'w', encoding='utf-8') as fi:
        # Header for CSV (optional if using COPY, but good for reference)
        # However, for COPY with psql, we don't necessarily need a header if we specify columns.
        
        id_counter = 1
        
        for i, customer in enumerate(customers):
            num_tx = actual_counts[i]
            cid = customer['id']
            join_date = max(customer['join_date'], START_DATE_LIMIT)
            
            days_available = (TODAY - join_date).days
            if days_available < 0: days_available = 0
            
            for _ in range(num_tx):
                # Random product
                p = random.choice(products)
                
                # Random date
                rand_days = random.randint(0, days_available)
                order_date = join_date + datetime.timedelta(days=rand_days)
                
                qty = random.randint(1, 10)
                total = p['price'] * qty
                
                # sales_id: format it as YYYYMMDD-serial
                # For 5M records, we need a unique ID.
                # Actually, psql SERIAL might handle it if we let it, 
                # but 'sales_id' is VARCHAR.
                # Let's use a unique string.
                sales_id = f"{order_date.strftime('%Y%m%d')}-{id_counter:010d}"
                id_counter += 1
                
                status = '배송완료'
                pay_status = '입금완료'

                # Sales CSV line (tab-separated is often easier for COPY)
                # columns: sales_id, customer_id, status, order_date, product_name, specification, unit_price, quantity, total_amount, payment_status, product_id, product_code
                fs.write(f"{sales_id}\t{cid}\t{status}\t{order_date}\t{p['name']}\t{p['spec']}\t{p['price']}\t{qty}\t{total}\t{pay_status}\t{p['id']}\t{p['code']}\n")
                
                # Inventory Log CSV line
                # columns: product_id, product_name, specification, product_code, change_type, change_quantity, reference_id, memo, created_at
                # change_type: '출고'
                fi.write(f"{p['id']}\t{p['name']}\t{p['spec']}\t{p['code']}\t출고\t-{qty}\t{sales_id}\t판매 등록\t{order_date} 09:00:00\n")

            if (i + 1) % 1000 == 0:
                print(f"Processed {i+1} customers...")

    print("Generation complete.")

if __name__ == '__main__':
    generate()
