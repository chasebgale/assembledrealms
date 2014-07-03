// TODO: Grab from URL parameters so users can save favorite searches
var __page = 0;
var __pageCount = 0;
var __resultsPerPage = 10;

$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
    event.preventDefault();
    $(this).ekkoLightbox();
});

function searchRealms(initial) {
    
    initial = typeof initial !== 'undefined' ? initial : true;
    
    var templateFn = _.template($('#realms_template').html());
    
    var parameters = {};
    parameters.page = __page;

    $.post("index.php", parameters, function (data) {
        if (data !== "null") {
            data = JSON.parse( data );
            
            if (initial) {
                __pageCount = Math.ceil(data.length / __resultsPerPage);
            }
            
            $("#realmList").html(templateFn({ 'realms':  data, 'initial': initial, 'page': __page, 'pages': __pageCount }));
            
            if (initial) {
                $("#results").fadeIn();
            }
        }
    });
}

$(document).ready(function () {
    searchRealms();
    
    $('#prevPage').on('click', function (e) {
        e.preventDefault();
        
        __page--;
        
        if ((__page >= 0) && (__page <= __pageCount)) {
            searchRealms(false);
        }
    });
    
    $('#nextPage').on('click', function (e) {
        e.preventDefault();
        
        __page++;
        
        if ((__page >= 0) && (__page <= __pageCount)) {
            searchRealms(false);
        }
    });
    
    $('.pageNumber').on('click', function (e) {
        e.preventDefault();
        
        __page == $(this).attr('data-page');
        
        if ((__page >= 0) && (__page <= __pageCount)) {
            searchRealms(false);
        }
    });
    
});