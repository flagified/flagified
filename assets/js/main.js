// ® Álvaro Lázaro - 2015
// This file is part of Flagified.
//
// Flagified is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Flagified is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var app = null;
var crop = 0;

(function() {
  'use strict';
  $.loadImage = function(url) {
    /*
     * Code by Andrew Davey
     * http://aboutcode.net/2013/01/09/load-images-with-jquery-deferred.html
     */

    // Define a "worker" function that should eventually resolve or reject the deferred object.
    var loadImage = function(deferred) {
      var image = new Image();

      // Set up event handlers to know when the image has loaded
      // or fails to load due to an error or abort.
      image.onload = loaded;
      image.onerror = errored; // URL returns 404, etc
      image.onabort = errored; // IE may call this if user clicks "Stop"
      image.crossOrigin = 'http://profile.ak.fbcdn.net/crossdomain.xml';

      // Setting the src property begins loading the image.
      image.src = url;

      function loaded() {
        unbindEvents();
        // Calling resolve means the image loaded sucessfully and is ready to use.
        deferred.resolve(image);
      }
      function errored() {
        unbindEvents();
        // Calling reject means we failed to load the image (e.g. 404, server offline, etc).
        deferred.reject(image);
      }
      function unbindEvents() {
        // Ensures the event callbacks only get called once.
        image.onload = null;
        image.onerror = null;
        image.onabort = null;
      }
    };

    // Create the deferred object that will contain the loaded image.
    // We don't want callers to have access to the resolve() and reject() methods,
    // so convert to "read-only" by calling `promise()`.
    return $.Deferred(loadImage).promise();
  };

  function dataURItoBlob(dataURI) {
    var byteString = atob(dataURI.split(',')[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {
      type: 'image/png'
    });
  }

  $(document).ready(function() {
    // Facebook initialization

    $.ajaxSetup({ cache: true });
    $.getScript('//connect.facebook.net/en_US/sdk.js', function(){
      app = new App();
      app.init();
    });
  });

  var App = function() {
  /* Javascript App. Handles all the Facebook API calls */

    var self = this;
    this.loggedIn = false;
    this.crops = null;
    this.accessToken = null;
    this.fbUserID = null;
    this.flagUrl = null;

    this.loadPicture = function(cropNumber) {
      $('.jumbotron').hide();
      $('.image-card, .control-buttons').show();
      self.cropNumber = cropNumber;
      FB.api('/me/picture?redirect=false',
        'GET',
        {'width': '600'},
        function(response) {
          var image = $.loadImage(response.data.url);
          var layerImage = $.loadImage(self.flagUrl);

          $.when(image, layerImage).done(self.mountPicture);
        }
      );
    };

    this.mountPicture = function(image, layerImage) {
      var cropNumber = self.cropNumber;
      var width = layerImage.width;
      var height = layerImage.height;

      if (!self.crop) {
        SmartCrop.crop(image,
          {
            width: width,
            height: height,
          },
          function(result) {
            self.crop = result.topCrop;
            self.drawImage(image, layerImage, self.crop);
          }
        );
      } else {
        self.drawImage(image, layerImage, self.crop);
      }
    };

    this.drawImage = function(image, layer, crop) {
      var height = crop.height;
      var width = crop.width;
      var canvas = $('<canvas class="image">')[0];
      var ctx = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(
          image, crop.x, crop.y, crop.width, crop.height, 0, 0,
          canvas.width, canvas.height);
      ctx.globalAlpha = 0.5;
      ctx.drawImage(
          layer, 0, 0, canvas.width, canvas.height);
      $('.image').replaceWith(canvas);
    };

    this.setAsProfilePicture = function(image) {
      var mimeType = 'image/png';
      var canvasData = image.toDataURL(mimeType);
      var blob;
      try{
        blob = dataURItoBlob(canvasData, mimeType);
      } catch(e) {
        console.log(e);
      }
      var fd = new FormData();
      fd.append('access_token', self.accessToken);
      fd.append('source', blob);
      fd.append('album', 'Flagified Pictures');
      try{
        $.ajax({
          url: 'https://graph.facebook.com/' + self.fbUserID + '/photos?access_token=' + self.accessToken,
          type: 'POST',
          data:fd,
          processData: false,
          contentType: false,
          cache: false,
          success: self.redirectToSetProfilePicture,
          error:function(shr, status, data){
            console.log('error ' + data + ' Status ' + shr.status);
          },
        });

      } catch(e) {
        console.log(e);
      }
    };

    this.redirectToSetProfilePicture = function(response) {
      var photoId = response.id;
      FB.api('/' + photoId,
          {'fields': 'link'},
          function(response) {
            window.location = response.link + '&makeprofile=1';
          });
    };

    this.initializeUI = function() {
      var cache = {};
      $.getJSON("./assets/json/flags.json", function(data) {
        for (var country in data) {
          var path = data[country];
          $('.country-select').append($('<option>').html(country).attr('value', path));
        }
      });
      $('.country-select').on('change', function (value) {
        var selectedOption = $('option:selected', this).val();
        if (selectedOption && self.loggedIn) {
          self.flagUrl = './assets/images/flags/' + selectedOption;
          self.loadPicture();
        }
      });
    };

    this.init = function() {
      self.initializeUI();
      FB.init({
        appId: appConfig.appId,
        status: true,
        cookie: true,
        xfbml: true,
        version: 'v3.2',
      });
      FB.Event.subscribe('auth.statusChange', function(response) {
        self.loggedIn = response.status === 'connected';
        if (self.loggedIn && response.authResponse) {
          self.accessToken = response.authResponse.accessToken;
          self.fbUserID = response.authResponse.userID;
          if (self.flagUrl) {
            self.loadPicture();
          }
        } else {
          self.accessToken = null;
          self.fbUserID = null;
        }
      });
    };

    return this;
  };
})();

