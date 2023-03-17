# Convert airtable to i18n (NO LONGER IN USE -- see pull_i18n_from_excel.py)
#
import sys
from airtable_credential import api_key

from pyairtable import Table
from pprint import pprint

# example table: https://airtable.com/appE96H4RoloCaBos/tblpQr44ltFH7ZJNx/viwpUoKQrWJVw8Byy?blocks=bipZu0dOaRlq4kuxP
base_id = 'appE96H4RoloCaBos'
table_name = 'tblpQr44ltFH7ZJNx'
view_id = 'viwpUoKQrWJVw8Byy'

table = Table(api_key, base_id, table_name)

fkeys = ['en','es','ko','tl','vi','zh-hans','zh-hant','location']
f_alias = {'location':'location_string'}
print("// Generated with a script")
print("// ")
print("module.exports = {")


rows = table.all()
rows = sorted(rows, key=lambda rec:(rec['fields']['_key'].lower()))
for ri,rec in enumerate(rows):
    fields = rec['fields']
    if ri > 0:
        print("")
    klabel = '"%s"' % (fields['_key']) if ' ' in fields['_key'] else fields['_key']
    print('  %s: {' % (klabel))
    for fkey in fkeys:
        try :
            kalias = f_alias[fkey] if fkey in f_alias else fkey
            fcontent = fields[kalias] if kalias in fields else 'null'
            fcontent = fcontent.replace('\\"','"')
            flabel = '"%s"' % (fkey) if '-' in fkey else fkey
            quote_char = '"' if '"' not in fcontent else "'"
            quoted_content = quote_char+fcontent+quote_char
            print('    %s: %s,' % (flabel,  quoted_content))
        except Exception as e:
            print(e)
            print("!!")
            print("Problem with fields can't find %s" % (fkey),fields)
            raise(e)

    print("  },")
print("};")
