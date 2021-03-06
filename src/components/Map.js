import React, { Component } from 'react'
import './Map.css'
import Menu from './Menu'
import { foursquareInfoWindow, getVenues } from '../api/foursquare.js'
import { loadGogleMapsAPI, makeMarkerIcon } from '../api/googlemaps.js'

/* global google */

class Map extends Component {
  constructor(props) {
    super(props)
    this.state = {
      markers: [],
      infowindow: {},
      bounds: {},
      map: {}
    }
    this.venues = getVenues()
  }

  componentDidMount() {
    window.initMap = this.initMap.bind(this)
    loadGogleMapsAPI()
  }

  initMap() {
    const self = this
    let markers = []
    let infowindow = new window.google.maps.InfoWindow()
    let bounds = new google.maps.LatLngBounds()

    const map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: -15.7983419, lng: -47.8755394 },
      zoom: 13
    })

    const defaultIcon = makeMarkerIcon('0091ff')
    const highlightedIcon = makeMarkerIcon('FFFF24')

    this.venues.then(result => {

      result.forEach((local, idx) => {
        const position = {
          lat: local.venue.location.lat,
          lng: local.venue.location.lng
        }
        const title = local.venue.name

        let marker = new google.maps.Marker({
          map,
          position,
          title,
          animation: google.maps.Animation.DROP,
          id: idx,
          icon: defaultIcon
        })

        marker.addListener('mouseover', function() {
          this.setIcon(highlightedIcon)
        })

        marker.addListener('mouseout', function() {
          this.setIcon(defaultIcon)
        })

        marker.addListener('click', function() {
          foursquareInfoWindow(local.venue.id).then(json => {
            const fsq = json.response.venue
            if (fsq) {
              let fsq_html = 'Foursquare: ' + fsq.likes.summary
              self.populateInfoWindow(this, fsq_html)
            } else {
              self.populateInfoWindow(this, json.meta.errorDetail)
            }
          })
          self.toggleBounce(this)
        })

        markers.push(marker)
        bounds.extend(markers[idx].position)

    })})

    this.setState({ markers, infowindow, bounds, map })
  }

  render() {
    return (
      <div>
        <Menu
          locations={this.venues.then(result => result)}
          choose={this.chooseALocation}
          hide={this.hideMarkers}
          show={this.showMarkers}
          markers={this.state.markers}
        />
        <div id="map" role="application"/>
      </div>
    )
  }

  populateInfoWindow = (marker, html) => {
    const infowindow = this.state.infowindow

    infowindow.marker = marker

    infowindow.addListener('closeclick', () => {
      infowindow.marker = null
      this.stopToggleBounce(marker)
    })

    const streetViewService = new google.maps.StreetViewService()
    const radius = 500

    let infoWindowContent =
      '<div>' + marker.title + '</div><div id="pano"></div><br />' + html

    const getStreetView = (data, status) => {
      if (status === google.maps.StreetViewStatus.OK) {
        const nearStreetViewLocation = data.location.latLng
        const heading = google.maps.geometry.spherical.computeHeading(
          nearStreetViewLocation,
          marker.position
        )
        infowindow.setContent(infoWindowContent)

        const panoramaOptions = {
          position: nearStreetViewLocation,
          pov: {
            heading,
            pitch: 30
          }
        }
        new google.maps.StreetViewPanorama(
          document.getElementById('pano'),
          panoramaOptions
        )
      } else {
        infowindow.setContent(
          '<div>' +
            marker.title +
            '</div><div>No Street View Found</div>' +
            html
        )
      }
    }

    streetViewService.getPanoramaByLocation(
      marker.position,
      radius,
      getStreetView
    )

    infowindow.setContent(infoWindowContent)

    infowindow.open(this.map, marker)
  }

  toggleBounce = selectedMarker => {
    this.stopToggleBounce(this.state.markers)
    if (selectedMarker.getAnimation() !== null) {
      selectedMarker.setAnimation(null)
    } else {
      selectedMarker.setAnimation(google.maps.Animation.BOUNCE)
    }
  }

  stopToggleBounce = mk => {
    Array.isArray(mk)
      ? mk.map(marker => this.markerAnimationToNull(marker))
      : this.markerAnimationToNull(mk)
  }

  markerAnimationToNull = mk =>
    mk.getAnimation !== null && mk.setAnimation(null)

  chooseALocation = selectedLocation => {
    const { markers } = this.state
    this.stopToggleBounce(markers)
    let marker = markers.find(mk => selectedLocation.venue.name === mk.title)
    this.toggleBounce(marker)
    this.populateInfoWindow(marker)
  }

  showMarkers = markers => {
    const { bounds, map } = this.state
    const mk = markers ? markers : this.state.markers
    mk.forEach(m => {
      m.setMap(map)
      bounds.extend(m.position)
    })
    map.fitBounds(bounds)
  }

  hideMarkers = markers => {
    const mk = markers ? markers : this.state.markers
    mk.map(m => m.setMap(null))
  }

}

export default Map
