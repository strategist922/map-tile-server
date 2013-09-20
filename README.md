
* Import data

```
psql -f /usr/share/postgresql/9.1/contrib/postgis-1.5/postgis.sql -d gis -U gis
psql -f /usr/share/postgresql/9.1/contrib/postgis-1.5/spatial_ref_sys.sql -d gis -U gis
osm2pgsql -d gis -U gis --password --cache 20000 --slim -S default.style <your.osm.pbf>
```

